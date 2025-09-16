// // lib/meteoraPriceUtils.ts - Updated Version
// interface MeteoraPoolInfo {
//   pool_address: string;
//   token_a_mint: string;
//   token_b_mint: string;
//   current_price: number;
//   price_24h_ago?: number;
//   volume_24h?: number;
//   liquidity_usd?: number;
//   price_change_24h?: number;
//   price_change_24h_percent?: number;
//   // Additional fields that might be present in pool info
//   token_a_reserve?: number;
//   token_b_reserve?: number;
// }

// interface TokenPriceData {
//   price: number;
//   priceChange24h: number;
//   priceChange24hPercent: number;
//   volume24h?: number;
//   liquidityUsd?: number;
// }

// export class MeteoraAPIClient {
//   // Corrected base URL - unified API for both mainnet and devnet
//   private baseUrl = 'https://dammv2-api.devnet.meteora.ag';
  
//   constructor(private apiKey?: string) {}

//   /**
//    * Fetch pool information by pool address
//    * Using the correct endpoint: GET /pools/{address}
//    */
//   async getPoolInfo(poolAddress: string): Promise<MeteoraPoolInfo | null> {
//     try {
//       const response = await fetch(`${this.baseUrl}/pools/${poolAddress}`, {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//           ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
//         }
//       });

//       if (!response.ok) {
//         console.error(`Failed to fetch pool info for ${poolAddress}: ${response.status}`);
//         return null;
//       }

//       const data = await response.json();
//       console.log("POOL INFO: ", data);
//       return data;
//     } catch (error) {
//       console.error(`Error fetching pool info for ${poolAddress}:`, error);
//       return null;
//     }
//   }

//   /**
//    * Fetch pool metrics by pool address for 24h price change data
//    * Using the correct endpoint: GET /pools/{address}/metrics
//    * This is optional and may return 404 for new tokens
//    */
//   async getPoolMetrics(poolAddress: string): Promise<any> {
//     try {
//       const response = await fetch(`${this.baseUrl}/pools/${poolAddress}/metrics`, {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//           ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
//         }
//       });

//       if (!response.ok) {
//         // Don't log 404 as error since it's expected for new tokens
//         if (response.status === 404) {
//           console.log(`Pool metrics not available for ${poolAddress} (likely a new token)`);
//         } else {
//           console.error(`Failed to fetch pool metrics for ${poolAddress}: ${response.status}`);
//         }
//         return null;
//       }

//       const data = await response.json();
//       return data;
//     } catch (error) {
//       console.error(`Error fetching pool metrics for ${poolAddress}:`, error);
//       return null;
//     }
//   }

//   /**
//    * Fetch all pools and filter by token mint address
//    * Using the correct endpoint: GET /pools with filtering
//    */
//   async getPoolsByTokenMint(tokenMintAddress: string): Promise<MeteoraPoolInfo[]> {
//     try {
//       // First get all pools
//       const response = await fetch(`${this.baseUrl}/pools`, {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//           ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
//         }
//       });

//       if (!response.ok) {
//         console.error(`Failed to fetch pools: ${response.status}`);
//         return [];
//       }

//       const data = await response.json();
//       const pools = Array.isArray(data) ? data : [];
      
//       // Filter pools that contain the token
//       return pools.filter((pool: any) => 
//         pool.token_a_mint === tokenMintAddress || 
//         pool.token_b_mint === tokenMintAddress
//       );
//     } catch (error) {
//       console.error(`Error fetching pools for token ${tokenMintAddress}:`, error);
//       return [];
//     }
//   }

//   /**
//    * Get token price data ONLY from pool info - NO METRICS CALLS
//    */
//   async getTokenPriceData(poolAddress: string): Promise<TokenPriceData | null> {
//     try {
//       // Get pool info (this should always work)
//       const poolInfo = await this.getPoolInfo(poolAddress);
      
//       if (!poolInfo) {
//         console.log(`No pool info available for ${poolAddress}`);
//         return null;
//       }

//       console.log(`Pool info for ${poolAddress}:`, poolInfo);

//       // Calculate current price from pool info
//       const currentPrice = this.calculatePriceFromPool(poolInfo);
      
//       if (currentPrice === 0) {
//         console.log(`Could not calculate price from pool info for ${poolAddress}`);
//         console.log(`Pool info structure:`, Object.keys(poolInfo));
//         return null;
//       }

//       // Get 24h change data ONLY from pool info - no metrics calls
//       let priceChange24h = 0;
//       let priceChange24hPercent = 0;

//       if (poolInfo.price_change_24h_percent !== undefined && poolInfo.price_change_24h_percent !== null) {
//         priceChange24hPercent = poolInfo.price_change_24h_percent;
//         priceChange24h = currentPrice * (priceChange24hPercent / 100);
//         console.log(`Using 24h change from pool info: ${priceChange24hPercent}%`);
//       } else if (poolInfo.price_24h_ago !== undefined && poolInfo.price_24h_ago > 0) {
//         // Calculate from price_24h_ago if available
//         const price24hAgo = poolInfo.price_24h_ago;
//         priceChange24h = currentPrice - price24hAgo;
//         priceChange24hPercent = ((currentPrice - price24hAgo) / price24hAgo) * 100;
//         console.log(`Calculated 24h change from price_24h_ago: ${priceChange24hPercent}%`);
//       } else {
//         // For new tokens, just use 0% change - NO METRICS CALL
//         console.log(`No 24h data in pool info for ${poolAddress}, using 0% change (new token)`);
//       }

//       const result = {
//         price: currentPrice,
//         priceChange24h,
//         priceChange24hPercent,
//         volume24h: poolInfo.volume_24h,
//         liquidityUsd: poolInfo.liquidity_usd
//       };

//       console.log(`Final result for ${poolAddress}:`, result);
//       return result;
//     } catch (error) {
//       console.error(`Error getting token price data for ${poolAddress}:`, error);
//       return null;
//     }
//   }

//   /**
//    * Calculate token price from pool reserves or current_price
//    * Enhanced to handle different response structures with better debugging
//    */
//   private calculatePriceFromPool(poolInfo: any): number {
//     console.log(`Calculating price from pool info:`, {
//       current_price: poolInfo.current_price,
//       price: poolInfo.price,
//       token_a_reserve: poolInfo.token_a_reserve,
//       token_b_reserve: poolInfo.token_b_reserve,
//       // Log all keys to see what's available
//       availableKeys: Object.keys(poolInfo)
//     });

//     // First try to use current_price if available
//     if (poolInfo.current_price !== undefined && poolInfo.current_price !== null && poolInfo.current_price > 0) {
//       console.log(`Using current_price: ${poolInfo.current_price}`);
//       return Number(poolInfo.current_price);
//     }
    
//     // Try price field
//     if (poolInfo.price !== undefined && poolInfo.price !== null && poolInfo.price > 0) {
//       console.log(`Using price: ${poolInfo.price}`);
//       return Number(poolInfo.price);
//     }

//     // Try to calculate from reserves if available
//     if (poolInfo.token_a_reserve && poolInfo.token_b_reserve && 
//         poolInfo.token_a_reserve > 0 && poolInfo.token_b_reserve > 0) {
//       const priceAtoB = Number(poolInfo.token_b_reserve) / Number(poolInfo.token_a_reserve);
//       const priceBtoA = Number(poolInfo.token_a_reserve) / Number(poolInfo.token_b_reserve);
      
//       console.log(`Calculated from reserves - A to B: ${priceAtoB}, B to A: ${priceBtoA}`);
      
//       // For most meme tokens, we want the smaller price (token/SOL ratio)
//       // You might need to adjust this logic based on your specific use case
//       const calculatedPrice = Math.min(priceAtoB, priceBtoA);
//       console.log(`Using calculated price: ${calculatedPrice}`);
//       return calculatedPrice;
//     }

//     // Check for other possible price fields in the response
//     const possiblePriceFields = [
//       'token_price', 'pool_price', 'spot_price', 'last_price', 
//       'trade_price', 'market_price', 'current_rate', 'exchange_rate'
//     ];
    
//     for (const field of possiblePriceFields) {
//       if (poolInfo[field] !== undefined && poolInfo[field] !== null && poolInfo[field] > 0) {
//         console.log(`Found price in field ${field}: ${poolInfo[field]}`);
//         return Number(poolInfo[field]);
//       }
//     }

//     console.error(`Could not determine price from pool info. Available fields:`, Object.keys(poolInfo));
//     console.error(`Pool info values:`, poolInfo);
//     return 0;
//   }

//   /**
//    * Batch fetch price data for multiple pools
//    * Enhanced error handling to prevent 404s from breaking the batch
//    */
//   async batchGetTokenPriceData(poolAddresses: string[]): Promise<Map<string, TokenPriceData>> {
//     const results = new Map<string, TokenPriceData>();
//     const batchSize = 3; // Reduced batch size to be more conservative
    
//     console.log(`💰 [METEORA] Starting batch fetch for ${poolAddresses.length} pools`);

//     for (let i = 0; i < poolAddresses.length; i += batchSize) {
//       const batch = poolAddresses.slice(i, i + batchSize);
//       console.log(`💰 [METEORA] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(poolAddresses.length/batchSize)}: ${batch.length} pools`);
      
//       const promises = batch.map(async (poolAddress) => {
//         try {
//           const priceData = await this.getTokenPriceData(poolAddress);
//           if (priceData) {
//             results.set(poolAddress, priceData);
//             console.log(`✅ [METEORA] Got price data for ${poolAddress}: $${priceData.price.toFixed(6)}`);
//           } else {
//             console.log(`⚠️ [METEORA] No price data for ${poolAddress}`);
//           }
//           return { poolAddress, priceData };
//         } catch (error) {
//           console.error(`❌ [METEORA] Error fetching price for ${poolAddress}:`, error);
//           return { poolAddress, priceData: null };
//         }
//       });

//       // Use Promise.allSettled to prevent one failure from breaking the batch
//       const batchResults = await Promise.allSettled(promises);
      
//       // Log any rejections
//       batchResults.forEach((result, index) => {
//         if (result.status === 'rejected') {
//           console.error(`❌ [METEORA] Batch promise rejected for ${batch[index]}:`, result.reason);
//         }
//       });
      
//       // Rate limiting delay between batches
//       if (i + batchSize < poolAddresses.length) {
//         console.log(`💤 [METEORA] Waiting 2s before next batch...`);
//         await new Promise(resolve => setTimeout(resolve, 2000));
//       }
//     }

//     console.log(`✅ [METEORA] Batch fetch completed: ${results.size}/${poolAddresses.length} successful`);
//     return results;
//   }
// }

// // Singleton instance
// export const meteoraClient = new MeteoraAPIClient();

// // Helper function to format price display
// export function formatPrice(price: number | string | undefined): string {
//   if (price === undefined || price === null || price === '') return '—';
  
//   const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
//   if (isNaN(numPrice) || numPrice <= 0) return '—';
  
//   if (numPrice < 0.001) {
//     return numPrice.toExponential(2);
//   }
//   if (numPrice < 1) {
//     return numPrice.toFixed(6);
//   }
//   if (numPrice < 100) {
//     return numPrice.toFixed(4);
//   }
//   return numPrice.toFixed(2);
// }

// // Helper function to format percentage change
// export function formatPriceChange(changePercent: number | undefined): string {
//   if (changePercent === undefined || changePercent === null || isNaN(changePercent)) {
//     return '0.00%';
//   }
  
//   const prefix = changePercent >= 0 ? '+' : '';
//   return `${prefix}${changePercent.toFixed(2)}%`;
// }

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
      console.log("POOL INFO: ", data);
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