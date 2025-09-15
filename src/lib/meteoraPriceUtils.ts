// lib/meteoraPriceUtils.ts - Corrected Version
interface MeteoraPoolInfo {
  pool_address: string;
  token_a_mint: string;
  token_b_mint: string;
  current_price: number;
  price_24h_ago?: number;
  volume_24h?: number;
  liquidity_usd?: number;
  price_change_24h?: number;
}

interface TokenPriceData {
  price: number;
  priceChange24h: number;
  priceChange24hPercent: number;
  volume24h?: number;
  liquidityUsd?: number;
}

export class MeteoraAPIClient {
  // Corrected base URL - unified API for both mainnet and devnet
  private baseUrl = 'https://dammv2-api.devnet.meteora.ag';
  
  constructor(private apiKey?: string) {}

  /**
   * Fetch pool information by pool address
   * Using the correct endpoint: GET /pools/{address}
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
        console.error(`Failed to fetch pool info for ${poolAddress}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching pool info for ${poolAddress}:`, error);
      return null;
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
   * Get token price data with 24h change
   * Combines pool info and metrics for complete price data
   */
  async getTokenPriceData(poolAddress: string): Promise<TokenPriceData | null> {
    try {
      // Fetch both pool info and metrics
      const [poolInfo, poolMetrics] = await Promise.all([
        this.getPoolInfo(poolAddress),
        this.getPoolMetrics(poolAddress)
      ]);
      
      if (!poolInfo) {
        return null;
      }

      // Calculate price from pool reserves
      const currentPrice = this.calculatePriceFromPool(poolInfo);
      
      // Get 24h data from metrics if available
      let priceChange24h = 0;
      let priceChange24hPercent = 0;
      
      if (poolMetrics && poolMetrics.price_change_24h_percent !== undefined) {
        priceChange24hPercent = poolMetrics.price_change_24h_percent;
        priceChange24h = currentPrice * (priceChange24hPercent / 100);
      }

      return {
        price: currentPrice,
        priceChange24h,
        priceChange24hPercent,
        volume24h: poolMetrics?.volume_24h || poolInfo.volume_24h,
        liquidityUsd: poolInfo.liquidity_usd
      };
    } catch (error) {
      console.error(`Error getting token price data for ${poolAddress}:`, error);
      return null;
    }
  }

  /**
   * Calculate token price from pool reserves
   * This is a basic implementation - you might need to adjust based on actual API response structure
   */
  private calculatePriceFromPool(poolInfo: any): number {
    // This depends on the actual structure of the API response
    // You may need to calculate from token reserves: tokenB_reserve / tokenA_reserve
    if (poolInfo.current_price !== undefined) {
      return poolInfo.current_price;
    }
    
    // Fallback calculation if reserves are provided
    if (poolInfo.token_a_reserve && poolInfo.token_b_reserve) {
      return poolInfo.token_b_reserve / poolInfo.token_a_reserve;
    }
    
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