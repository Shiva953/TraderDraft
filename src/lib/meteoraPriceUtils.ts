import BN from 'bn.js';
import { getPriceFromSqrtPrice, CpAmm } from '@meteora-ag/cp-amm-sdk';
import { Connection, PublicKey } from '@solana/web3.js';

interface MeteoraPoolInfo {
  pool_address: string;
  token_a_mint: string;
  token_b_mint: string;
  sqrt_price?: string | number; // Sqrt price in Q64 format from API
  current_price?: number;
  pool_price?: number;
  virtual_price?: number;
  price_24h_ago?: number;
  volume_24h?: number;
  volume24h?: number;
  liquidity_usd?: number;
  tvl?: number;
  price_change_24h?: number;
  token_a_amount?: number;
  token_b_amount?: number;
  token_a_reserve?: number;
  token_b_reserve?: number;
  fee24h?: number;
}

interface TokenPriceData {
  price: number;
  priceChange24h: number;
  priceChange24hPercent: number;
  volume24h?: number;
  liquidityUsd?: number;
  totalSupply?: number;
  marketCap?: number;
  circulatingSupply?: number;
  holdersCount?: number;
}

export class MeteoraAPIClient {
  // Corrected base URL - unified API for both mainnet and devnet
  private baseUrl = 'https://dammv2-api.devnet.meteora.ag';

  // Token decimals (SOL/WSOL has 9, most tokens have 6)
  private readonly TOKEN_A_DECIMALS = 6; // KOL tokens
  private readonly TOKEN_B_DECIMALS = 9; // SOL (WSOL)

  // On-chain connection for direct pool queries
  private connection: Connection;
  private cpAmm: CpAmm;

  // Cache for SOL/USD price to ensure consistency within a request
  private solPriceCache: { price: number; timestamp: number } | null = null;
  private readonly CACHE_DURATION_MS = 300000; // 5 minutes cache to avoid rate limits

  // Cache for individual token prices (poolAddress -> TokenPriceData)
  private tokenPriceCache: Map<string, { data: TokenPriceData; timestamp: number }> = new Map();
  private readonly TOKEN_PRICE_CACHE_MS = 120000; // 2 minutes cache for token prices

  constructor(private apiKey?: string) {
    this.connection = new Connection("https://devnet.helius-rpc.com/?api-key=017f56ed-c6c1-480a-8c11-dbc09ab2358d", "confirmed");
    this.cpAmm = new CpAmm(this.connection);
  }

  /**
   * Fetch pool state directly from on-chain (fallback when API is down/slow)
   */
  async getPoolStateOnChain(poolAddress: string): Promise<MeteoraPoolInfo | null> {
    try {
      console.log(`🔗 [ON-CHAIN] Fetching pool state directly for ${poolAddress}`);
      const poolPubkey = new PublicKey(poolAddress);
      const poolState = await this.cpAmm.fetchPoolState(poolPubkey);

      if (!poolState) {
        console.error(`❌ [ON-CHAIN] Pool state not found for ${poolAddress}`);
        return null;
      }

      console.log(`✅ [ON-CHAIN] Pool state fetched:`, {
        sqrt_price: poolState.sqrtPrice.toString(),
        token_a_mint: poolState.tokenAMint.toBase58(),
        token_b_mint: poolState.tokenBMint.toBase58()
      });

      // Convert on-chain data to API format
      return {
        pool_address: poolAddress,
        token_a_mint: poolState.tokenAMint.toBase58(),
        token_b_mint: poolState.tokenBMint.toBase58(),
        sqrt_price: poolState.sqrtPrice.toString(),
        current_price: 0, // Will be calculated from sqrt_price
        pool_price: 0,
        virtual_price: 0,
        liquidity_usd: 0,
        tvl: 0
      };
    } catch (error) {
      console.error(`❌ [ON-CHAIN] Error fetching pool state:`, error);
      return null;
    }
  }

  /**
   * Fetch pool information by pool address
   * Using the correct endpoint: GET /pools/{address}
   * Falls back to on-chain if API returns 404 (pool not indexed yet)
   */
  async getPoolInfo(poolAddress: string): Promise<MeteoraPoolInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/pools/${poolAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`⚠️ [API] Pool ${poolAddress} not indexed yet (404), falling back to on-chain`);
          return await this.getPoolStateOnChain(poolAddress);
        }
        console.error(`Failed to fetch pool info for ${poolAddress}: ${response.status}`);
        return null;
      }

      const responseData = await response.json();
      console.log("POOL INFO RAW: ", responseData);

      // Handle the nested structure where actual pool data is in responseData.data
      const poolData = responseData.data || responseData;
      console.log("POOL INFO EXTRACTED: ", poolData);

      return poolData;
    } catch (error) {
      console.error(`Error fetching pool info for ${poolAddress}:`, error);
      // Try on-chain fallback on network errors too
      console.warn(`⚠️ [API] Network error, trying on-chain fallback`);
      return await this.getPoolStateOnChain(poolAddress);
    }
  }

  /**
   * Fetch pool metrics by pool address for 24h price change data
   * Using the correct endpoint: GET /pools/{address}/metrics
   */
  async getPoolMetrics(poolAddress: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/pools/${poolAddress}/metrics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      });

      if (!response.ok) {
        console.error(`Failed to fetch pool metrics for ${poolAddress}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching pool metrics for ${poolAddress}:`, error);
      return null;
    }
  }

  /**
   * Fetch all pools and filter by token mint address
   * Using the correct endpoint: GET /pools with filtering
   */
  async getPoolsByTokenMint(tokenMintAddress: string): Promise<MeteoraPoolInfo[]> {
    try {
      // First get all pools
      const response = await fetch(`${this.baseUrl}/pools`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      });

      if (!response.ok) {
        console.error(`Failed to fetch pools: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const pools = Array.isArray(data) ? data : [];
      
      // Filter pools that contain the token
      return pools.filter((pool: any) => 
        pool.token_a_mint === tokenMintAddress || 
        pool.token_b_mint === tokenMintAddress
      );
    } catch (error) {
      console.error(`Error fetching pools for token ${tokenMintAddress}:`, error);
      return [];
    }
  }

  /**
   * Fetch SOL price from Binance API (PRIMARY - No rate limits, very reliable)
   */
  private async getSOLPriceFromBinance(): Promise<number> {
    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Binance API failed with status ${response.status}`);
      }

      const data = await response.json();
      const solPrice = parseFloat(data?.price);

      if (!isNaN(solPrice) && solPrice > 0) {
        console.log(`✅ [BINANCE] SOL/USDT price: $${solPrice.toFixed(2)}`);
        return solPrice;
      }

      throw new Error(`Invalid price from Binance: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error(`❌ [BINANCE] Error:`, error);
      throw error;
    }
  }

  /**
   * Fetch SOL price from CryptoCompare API (FALLBACK 1)
   */
  private async getSOLPriceFromCryptoCompare(): Promise<number> {
    try {
      const response = await fetch('https://min-api.cryptocompare.com/data/price?fsym=SOL&tsyms=USD', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`CryptoCompare API failed with status ${response.status}`);
      }

      const data = await response.json();
      const solPrice = data?.USD;

      if (typeof solPrice === 'number' && solPrice > 0) {
        console.log(`✅ [CRYPTOCOMPARE] SOL/USD price: $${solPrice.toFixed(2)}`);
        return solPrice;
      }

      throw new Error(`Invalid price from CryptoCompare: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error(`❌ [CRYPTOCOMPARE] Error:`, error);
      throw error;
    }
  }

  /**
   * Fetch SOL price from CoinGecko API (FALLBACK 2 - Has rate limits)
   */
  private async getSOLPriceFromCoinGecko(): Promise<number> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`CoinGecko API failed with status ${response.status}`);
      }

      const data = await response.json();
      const solPrice = data?.solana?.usd;

      if (typeof solPrice === 'number' && solPrice > 0) {
        console.log(`✅ [COINGECKO] SOL/USD price: $${solPrice.toFixed(2)}`);
        return solPrice;
      }

      throw new Error(`Invalid price from CoinGecko: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error(`❌ [COINGECKO] Error:`, error);
      throw error;
    }
  }

  /**
   * Fetch live SOL price in USD with multi-source fallback
   * Uses 5-minute cache to ensure price consistency and avoid rate limits
   * 
   * Sources (in order):
   * 1. Binance API - No rate limits, very reliable
   * 2. CryptoCompare - Generous free tier
   * 3. CoinGecko - Last resort (has rate limits)
   */
  async getSOLPriceUSD(): Promise<number> {
    // Check cache first (5-minute TTL)
    const now = Date.now();
    if (this.solPriceCache && (now - this.solPriceCache.timestamp < this.CACHE_DURATION_MS)) {
      const ageSeconds = Math.floor((now - this.solPriceCache.timestamp) / 1000);
      console.log(`✅ [CACHE] Using cached SOL price: $${this.solPriceCache.price.toFixed(2)} (age: ${ageSeconds}s)`);
      return this.solPriceCache.price;
    }

    console.log(`🔍 [PRICE] Fetching live SOL/USD price from multiple sources...`);

    // Try sources in order
    const sources = [
      { name: 'Binance', fn: () => this.getSOLPriceFromBinance() },
      { name: 'CryptoCompare', fn: () => this.getSOLPriceFromCryptoCompare() },
      { name: 'CoinGecko', fn: () => this.getSOLPriceFromCoinGecko() },
    ];

    for (const source of sources) {
      try {
        const price = await source.fn();
        
        // Cache the successful price
        this.solPriceCache = { price, timestamp: now };
        console.log(`✅ [${source.name.toUpperCase()}] Live SOL price fetched and cached: $${price.toFixed(2)}`);
        return price;
      } catch (error) {
        console.warn(`⚠️ [${source.name.toUpperCase()}] Failed, trying next source...`);
        // Continue to next source
      }
    }

    // If all sources fail
    const errorMsg = 'All price sources failed (Binance, CryptoCompare, CoinGecko). Cannot calculate accurate prices.';
    console.error(`❌ [PRICE] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  /**
   * Get token holders count by fetching token accounts from RPC
   * Uses getProgramAccounts to count all token accounts with non-zero balance
   */
  async getTokenHoldersCount(mintAddress: string): Promise<number> {
    try {
      console.log(`👥 [HOLDERS] Fetching holders count for mint: ${mintAddress}`);
      const mintPubkey = new PublicKey(mintAddress);

      // Get all token accounts for this mint with non-zero balance
      // Using data slice to only get balance field (bytes 64-72) for efficiency
      const TOKEN_ACCOUNT_SIZE = 165;
      const accounts = await this.connection.getProgramAccounts(
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), // SPL Token Program
        {
          filters: [
            { dataSize: TOKEN_ACCOUNT_SIZE }, // Token account size
            {
              memcmp: {
                offset: 0, // Mint address is at offset 0
                bytes: mintPubkey.toBase58()
              }
            }
          ],
          dataSlice: { offset: 64, length: 8 } // Only fetch balance field
        }
      );

      // Count accounts with non-zero balance
      let holdersCount = 0;
      for (const account of accounts) {
        const balance = Buffer.from(account.account.data).readBigUInt64LE();
        if (balance > BigInt(0)) {
          holdersCount++;
        }
      }

      console.log(`✅ [HOLDERS] Found ${holdersCount} holders for ${mintAddress.slice(0, 8)}...`);
      return holdersCount;
    } catch (error) {
      console.error(`❌ [HOLDERS] Error fetching holders count:`, error);
      return 0;
    }
  }

  /**
   * Get token price data with 24h change
   * Combines pool info and metrics for complete price data
   * Uses Meteora SDK's getPriceFromSqrtPrice to accurately calculate price from sqrt_price
   * Now with 2-minute caching to speed up subsequent requests
   */
  async getTokenPriceData(poolAddress: string, mintAddress?: string): Promise<TokenPriceData | null> {
    // Check cache first
    const now = Date.now();
    const cached = this.tokenPriceCache.get(poolAddress);
    if (cached && (now - cached.timestamp < this.TOKEN_PRICE_CACHE_MS)) {
      const ageSeconds = Math.floor((now - cached.timestamp) / 1000);
      console.log(`✅ [CACHE] Using cached price for ${poolAddress.slice(0, 8)}... (age: ${ageSeconds}s)`);
      return cached.data;
    }

    try {
      // Fetch pool info, metrics, and SOL price in parallel
      const [poolInfo, poolMetrics, solPriceUSD] = await Promise.all([
        this.getPoolInfo(poolAddress),
        this.getPoolMetrics(poolAddress),
        this.getSOLPriceUSD()
      ]);

      if (!poolInfo) {
        console.warn(`⚠️ [PRICE] No pool info returned for ${poolAddress}`);
        return null;
      }

      // Calculate price using Meteora SDK (prioritizes sqrt_price)
      const currentPrice = this.calculatePriceFromPool(poolInfo);

      if (currentPrice === 0) {
        console.warn(`⚠️ [PRICE] Could not calculate valid price for ${poolAddress}`);
        return null;
      }

      // Get 24h data from metrics if available
      let priceChange24h = 0;
      let priceChange24hPercent = 0;

      if (poolMetrics && poolMetrics.price_change_24h_percent !== undefined) {
        priceChange24hPercent = poolMetrics.price_change_24h_percent;
        priceChange24h = currentPrice * (priceChange24hPercent / 100);
      }

      // Convert SOL price to USD using live price (multi-source with cache)
      const priceInUSD = currentPrice * solPriceUSD;
      const priceChange24hUSD = priceChange24h * solPriceUSD;

      console.log(`✅ [PRICE] Final price data for ${poolAddress}:`);
      console.log(`   Token Price (SOL): ${currentPrice.toFixed(9)} SOL`);
      console.log(`   SOL/USD Rate: $${solPriceUSD.toFixed(2)}`);
      console.log(`   Token Price (USD): $${priceInUSD.toFixed(9)} (${currentPrice.toFixed(9)} × $${solPriceUSD.toFixed(2)})`);
      console.log(`   24h Change: ${priceChange24hPercent.toFixed(2)}%`);

      // Total supply for KOL tokens (as defined in createTokensAndPoolV2: 1 billion)
      const totalSupply = 1000000000; // 1 billion

      // Circulating supply is fixed at 60M (6% of total supply minted to pool)
      // This is the actual amount minted as defined in createTokensAndPoolV2
      const circulatingSupply = 60000000; // 60M tokens

      // Fetch holders count if mintAddress provided
      let holdersCount = 0;

      if (mintAddress) {
        try {
          holdersCount = await this.getTokenHoldersCount(mintAddress);
          console.log(`✅ [HOLDERS] ${holdersCount} holders for ${mintAddress.slice(0, 8)}...`);
        } catch (error) {
          console.warn(`⚠️ [HOLDERS] Error fetching holders count:`, error);
        }
      }

      // Market cap should be based on circulating supply, not total supply
      const marketCap = circulatingSupply * priceInUSD;

      console.log(`💰 [MARKET CAP CALC] Pool ${poolAddress.slice(0, 8)}...:`);
      console.log(`   Total Supply: ${totalSupply.toLocaleString()} (max possible)`);
      console.log(`   Circulating Supply: ${circulatingSupply.toLocaleString()} (currently minted)`);
      console.log(`   Holders: ${holdersCount}`);
      console.log(`   Price (USD): $${priceInUSD.toFixed(9)}`);
      console.log(`   Market Cap: $${marketCap.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);

      // Debug liquidity data
      console.log(`🔍 [LIQUIDITY DEBUG] Pool info liquidity fields:`, {
        liquidity_usd: poolInfo.liquidity_usd,
        tvl: poolInfo.tvl,
        token_a_reserve: poolInfo.token_a_reserve,
        token_b_reserve: poolInfo.token_b_reserve,
        token_a_amount: poolInfo.token_a_amount,
        token_b_amount: poolInfo.token_b_amount
      });

      // Calculate liquidity USD - fallback to calculating from reserves if API doesn't provide it
      let liquidityUsd = poolInfo.liquidity_usd || poolInfo.tvl;

      // If liquidity is not available from API, calculate from reserves
      if (!liquidityUsd && poolInfo.token_b_reserve) {
        // Token B is SOL (WSOL), so we can calculate total liquidity from SOL reserves
        // Total liquidity = 2 * SOL reserves * SOL price (since pool is balanced)
        const solReserve = poolInfo.token_b_reserve;
        liquidityUsd = 2 * solReserve * solPriceUSD;
        console.log(`💧 [LIQUIDITY] Calculated from reserves: ${solReserve} SOL × 2 × $${solPriceUSD} = $${liquidityUsd.toFixed(2)}`);
      }

      const priceData: TokenPriceData = {
        price: priceInUSD,
        priceChange24h: priceChange24hUSD,
        priceChange24hPercent,
        volume24h: poolMetrics?.volume_24h || poolInfo.volume_24h || poolInfo.volume24h,
        liquidityUsd,
        totalSupply,
        circulatingSupply,
        marketCap,
        holdersCount
      };

      console.log(`📦 [PRICE DATA OBJECT]:`, JSON.stringify({
        price: priceData.price,
        marketCap: priceData.marketCap,
        totalSupply: priceData.totalSupply,
        liquidityUsd: priceData.liquidityUsd
      }));

      // Cache the result before returning
      this.tokenPriceCache.set(poolAddress, { data: priceData, timestamp: now });
      console.log(`💾 [CACHE] Cached price for ${poolAddress.slice(0, 8)}...`);

      return priceData;
    } catch (error) {
      console.error(`Error getting token price data for ${poolAddress}:`, error);
      return null;
    }
  }

  /**
   * Calculate token price from pool sqrt_price using Meteora SDK
   * Uses getPriceFromSqrtPrice to convert Q64 format sqrt price to human-readable price
   */
  private calculatePriceFromPool(poolInfo: any): number {
    console.log(`🔍 [PRICE] Calculating price from pool info:`, {
      sqrt_price: poolInfo.sqrt_price,
      current_price: poolInfo.current_price,
      pool_price: poolInfo.pool_price,
      virtual_price: poolInfo.virtual_price,
      has_reserves: !!(poolInfo.token_a_reserve && poolInfo.token_b_reserve)
    });

    // Method 1: Use sqrt_price with Meteora SDK (RECOMMENDED)
    if (poolInfo.sqrt_price !== undefined && poolInfo.sqrt_price !== null) {
      try {
        // Convert sqrt_price to BN (it comes as a number/string from API)
        const sqrtPriceBN = new BN(poolInfo.sqrt_price.toString().split('.')[0]); // Remove decimals if any

        console.log(`💹 [PRICE] Converting sqrt_price: ${poolInfo.sqrt_price} -> BN: ${sqrtPriceBN.toString()}`);

        // Use Meteora SDK to convert sqrt price to human-readable price
        // Note: getPriceFromSqrtPrice returns a Decimal object, not a string
        const priceDecimal = getPriceFromSqrtPrice(
          sqrtPriceBN,
          this.TOKEN_A_DECIMALS, // KOL token (6 decimals)
          this.TOKEN_B_DECIMALS  // SOL (9 decimals)
        );

        // Convert Decimal to number
        const price = parseFloat(priceDecimal.toString());
        console.log(`✅ [PRICE] Calculated price from sqrt_price: ${price} (${priceDecimal.toString()})`);

        if (!isNaN(price) && price > 0) {
          return price;
        }
      } catch (error) {
        console.error(`❌ [PRICE] Error calculating price from sqrt_price:`, error);
      }
    }

    // Method 2: Use current_price if available
    if (poolInfo.current_price !== undefined && poolInfo.current_price > 0) {
      console.log(`✅ [PRICE] Using current_price: ${poolInfo.current_price}`);
      return poolInfo.current_price;
    }

    // Method 3: Use pool_price if available
    if (poolInfo.pool_price !== undefined && poolInfo.pool_price > 0) {
      console.log(`✅ [PRICE] Using pool_price: ${poolInfo.pool_price}`);
      return poolInfo.pool_price;
    }

    // Method 4: Use virtual_price if available
    if (poolInfo.virtual_price !== undefined && poolInfo.virtual_price > 0) {
      console.log(`✅ [PRICE] Using virtual_price: ${poolInfo.virtual_price}`);
      return poolInfo.virtual_price;
    }

    // Method 5: Fallback calculation from reserves
    if (poolInfo.token_a_reserve && poolInfo.token_b_reserve &&
        poolInfo.token_a_reserve > 0 && poolInfo.token_b_reserve > 0) {
      const price = poolInfo.token_b_reserve / poolInfo.token_a_reserve;
      console.log(`✅ [PRICE] Calculated from reserves: ${price}`);
      return price;
    }

    console.warn(`⚠️ [PRICE] Could not calculate price from pool info`);
    return 0;
  }

  /**
   * Batch fetch price data for multiple pools
   */
  async batchGetTokenPriceData(poolAddresses: string[]): Promise<Map<string, TokenPriceData>> {
    const results = new Map<string, TokenPriceData>();
    const batchSize = 5; // Reduced batch size to be more conservative

    for (let i = 0; i < poolAddresses.length; i += batchSize) {
      const batch = poolAddresses.slice(i, i + batchSize);
      const promises = batch.map(async (poolAddress) => {
        const priceData = await this.getTokenPriceData(poolAddress);
        if (priceData) {
          results.set(poolAddress, priceData);
        }
        return { poolAddress, priceData };
      });

      await Promise.allSettled(promises);
      
      // Rate limiting delay between batches
      if (i + batchSize < poolAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay
      }
    }

    return results;
  }
}

// Singleton instance
export const meteoraClient = new MeteoraAPIClient();

// Helper function to format price display
export function formatPrice(price: number): string {
  if (price < 0.001) {
    return price.toExponential(2);
  }
  if (price < 1) {
    return price.toFixed(4);
  }
  if (price < 100) {
    return price.toFixed(3);
  }
  return price.toFixed(2);
}

// Helper function to format percentage change
export function formatPriceChange(changePercent: number): string {
  const prefix = changePercent >= 0 ? '+' : '';
  return `${prefix}${changePercent.toFixed(2)}%`;
}