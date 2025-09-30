/**
 * Database types - Prisma-derived and extended types
 */

// Re-export Prisma types for convenience
export type {
  User,
  Trader,
  Competition,
  CompetitionEntry,
  KolHolding,
  Order,
  ScrapingMetadata,
  Rarity,
  Period,
  CompetitionStatus,
} from "@prisma/client";

// Extended Prisma types for specific use cases
export type TraderWithToken = {
  id: string;
  name: string;
  address: string;
  rank: number;
  pnl: string;
  winRate: number | null;
  avatarUrl: string | null;
  xUrl: string | null;
  tokenMintAddress: string;
  poolAddress: string | null;
  ticker: string | null;
  rarity: string | null;
  period: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UserWithPacks = {
  packHoldings: number;
  totalValueOfPackHoldings: number;
  claimedPacks: number;
  unclaimedPacks: number;
};