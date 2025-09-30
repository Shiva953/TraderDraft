/**
 * Transaction and blockchain types
 */

import type { ConsolidatedKolData } from "./kol";

export interface TransferResult {
  signature: string;
  kol: ConsolidatedKolData;
  success: boolean;
  error?: string;
}

export interface PurchaseState {
  isLoading: boolean;
  txnHash: string | null;
  showSuccess: boolean;
  error: string | null;
}

export interface BuyPackResponse {
  success: boolean;
  data: {
    buyPackTransaction: string;
  };
  error?: string;
}

export interface ClaimAllTokensRequest {
  userPrivyWalletAddress: string;
  consolidatedKols: ConsolidatedKolData[];
}