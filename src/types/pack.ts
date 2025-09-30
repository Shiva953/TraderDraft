/**
 * Pack system types
 */

import type { KolData, KolDataWithRarity, ConsolidatedKolData } from "./kol";

export interface PackData {
  packId: string;
  kols: KolData[];
}

export interface PackDataWithRarity {
  packId: string;
  kols: KolDataWithRarity[];
}

export interface RevealAllPacksRequest {
  numberOfPacks: number;
  userPublicKey?: string;
  initializeRarity?: boolean;
}

export interface PackRevealRequest {
  packId: string;
  userPublicKey?: string;
}

export interface MultiPackRevealResponse {
  success: boolean;
  message?: string;
  data: {
    revealType: string;
    revealedAt: string;
    totalPacksRevealed: number;
    totalUniqueKols: number;
    transactionSignatures: string[];
    packCreationSignatures?: string[];
    executionMode: string;
    network: string;
    optimizations?: string[];
    consolidatedKols: ConsolidatedKolData[];
    packs?: PackData[];
    stats: {
      totalPacksRevealed: number;
      totalUniqueKols: number;
      totalTokensReceived: number;
      totalEstimatedValueSOL: number;
      totalEstimatedValueUSD: number;
      avgWinRate: number;
      totalPnl: number;
      avgRank: number;
      bestRank: number;
      worstRank: number;
      mostFrequentKol: ConsolidatedKolData;
      duplicateRate: number;
    };
    rarityStats?: {
      distribution: Array<{
        rarity: string;
        label: string;
        color: string;
        expectedPercentage: number;
        actualCount: number;
        actualPercentage: number;
      }>;
      totalRarityScore: number;
    };
  };
}