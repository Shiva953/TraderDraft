/**
 * API request/response types
 */

import type { TraderApiData, PeriodData } from "./kol";
import type { UserPacksData, TokenHolding, OrderRecord } from "./user";

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface ApiOptions {
  dedupe?: boolean;
  cacheTtl?: number;
}

export interface LeaderboardApiResponse {
  ok: boolean;
  message: string;
  period: string;
  timestamp: string;
  selected: {
    traders: TraderApiData[];
    totalTraders: number;
    lastUpdated: string | null;
    period: string;
  };
  data?: {
    daily: PeriodData;
    weekly: PeriodData;
    monthly: PeriodData;
  };
}

export interface OrdersResponse {
  success: boolean;
  data: OrderRecord[];
  error?: string;
}

export interface UserPacksResponse {
  success: boolean;
  data: UserPacksData;
  error?: string;
}

export interface TokenHoldingsResponse {
  success: boolean;
  data: {
    holdings: TokenHolding[];
    totalHoldings: number;
  };
  error?: string;
}