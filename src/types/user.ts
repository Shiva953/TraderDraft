/**
 * User data types
 */

import type { TraderApiData } from "./kol";

/**
 * User pack holdings data
 */
export interface UserPacksData {
  packHoldings: number;
  totalValueOfPackHoldings: number;
  claimedPacks: number;
  unclaimedPacks: number;
}

/**
 * User KOL token holding
 */
export interface TokenHolding {
  ticker: string;
  name: string;
  balance: string;
  mintAddress: string;
  poolAddress?: string;
  tokenPrice?: string;
  priceChange24h?: string;
  priceChange24hPercent?: number;
}

/**
 * User order/purchase record
 */
export interface OrderRecord {
  id: string;
  packsBought: number;
  totalValue: number;
  transactionHash?: string;
  createdAt: string;
}

/**
 * Complete user data
 */
export interface UserData {
  packs: UserPacksData | null;
  tokenHoldings: TokenHolding[];
  tokenHoldingsCount: number;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}