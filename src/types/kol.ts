/**
 * KOL (Key Opinion Leader) and Trader types
 */

import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import type { Rarity } from "./database";

/**
 * Base KOL data structure used across the application
 */
export interface KolData {
  id: string;
  name: string;
  address: string | null;
  pnl: string;
  winRate: number | null;
  avatarUrl: string | null;
  xUrl: string | null;
  rank: number;
  ticker?: string;
  tokenMintAddress?: PublicKey;
  tokenPrice?: number;
  packOccurrences?: number;
  totalTokens?: BN;
}

/**
 * KOL data with rarity information
 */
export interface KolDataWithRarity extends KolData {
  rarity: Rarity;
  rarityWeight: number;
}

/**
 * Consolidated KOL data across multiple packs
 */
export interface ConsolidatedKolData extends KolData {
  packOccurrences: number;
  totalTokens: BN;
  packIds: string[];
  tokensReceived?: string;
  tokensReceivedFormatted?: string;
  totalTokenAmount?: number;
  totalTokenAmountFormatted?: string;
  estimatedValueSOL?: number;
  estimatedValueUSD?: number;
  transferSignature?: string | null;
  rarity?: Rarity;
  rarityWeight?: number;
}

/**
 * Leaderboard display entry (frontend)
 */
export interface LeaderboardEntry {
  rank: number;
  handle: string;
  ticker?: string;
  avatarUrl?: string;
  xUrl?: string;
  traderUrl?: string;
  pnl: string;
  avgDailyPnl?: string;
  winRate: string;
  walletAddress?: string;
  tokenPrice?: string;
  priceChange24h?: string;
  priceChange24hPercent?: number;
  poolAddress?: string;
  tokenMintAddress?: string;
  marketCap?: number;
  totalSupply?: number;
}

/**
 * Raw trader data from API (frontend hook)
 */
export interface TraderApiData {
  rank: number;
  name: string;
  ticker?: string;
  address: string;
  pnl: string;
  avgDailyPnl?: string;
  winRate: string;
  avatarUrl?: string;
  xUrl?: string;
  tokenMintAddress?: string;
  poolAddress?: string;
  tokenPrice?: string;
  priceChange24h?: string;
  priceChange24hPercent?: number;
  marketCap?: number;
  totalSupply?: number;
}

/**
 * Period-specific leaderboard data
 */
export interface PeriodData {
  traders: TraderApiData[];
  totalTraders: number;
  lastUpdated: string | null;
  period: string;
}