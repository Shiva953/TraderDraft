import { useState, useCallback, useEffect, useMemo } from 'react';
import { useApi } from './useApi';

export interface TraderData {
  rank: number;
  name: string;
  address: string;
  pnl: string;
  winRate: string;
  avatarUrl?: string;
  xUrl?: string;
  tokenMintAddress?: string;
  poolAddress?: string;
  tokenPrice?: string;
  priceChange24h?: string;
  priceChange24hPercent?: number;
}

export interface LeaderboardEntry {
  rank: number;
  handle: string;
  avatarUrl?: string;
  xUrl?: string;
  traderUrl?: string;
  pnl: string;
  winRate: string;
  walletAddress?: string;
  tokenPrice?: string;
  priceChange24h?: string;
  priceChange24hPercent?: number;
  poolAddress?: string;
  tokenMintAddress?: string;
}

export interface PeriodData {
  traders: TraderData[];
  totalTraders: number;
  lastUpdated: string | null;
  period: string;
}

// Define the API response type
export interface ApiResponse {
  ok: boolean;
  message: string;
  period: string;
  timestamp: string;
  selected: {
    traders: TraderData[];
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

export type Period = 'daily' | 'weekly' | 'monthly';

const convertApiDataToLeaderboardEntry = (data: TraderData[]): LeaderboardEntry[] => {
  return data.map((trader) => {
    const traderUrl = trader.address 
      ? `https://kolscan.io/account/${trader.address}` 
      : undefined;
    const xUrl = trader.xUrl 
      ? trader.xUrl.startsWith('http') 
        ? trader.xUrl 
        : `https://twitter.com/${trader.xUrl.replace('@', '')}`
      : undefined;

    return {
      rank: trader.rank,
      handle: trader.name || `Trader ${trader.rank}`,
      avatarUrl: trader.avatarUrl,
      xUrl,
      traderUrl,
      pnl: trader.pnl,
      winRate: Number(trader.winRate).toFixed(2),
      walletAddress: trader.address,
      tokenPrice: trader.tokenPrice,
      priceChange24h: trader.priceChange24h,
      priceChange24hPercent: trader.priceChange24hPercent,
      poolAddress: trader.poolAddress,
      tokenMintAddress: trader.tokenMintAddress,
    };
  });
};

export const useLeaderboard = (initialPeriod: Period = 'daily') => {
  const [currentPeriod, setCurrentPeriod] = useState<Period>(initialPeriod);
  const [allPeriodsData, setAllPeriodsData] = useState<Record<Period, PeriodData> | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Explicitly type the useApi hook with the ApiResponse interface
  const { data, loading, error, execute } = useApi<ApiResponse>('/api/getTopTraders', {
    dedupe: true,
    cacheTtl: 60000, // 1 minute cache for leaderboard
  });

  const leaderboardData = useMemo(() => {
    if (!data?.selected?.traders) return [];
    return convertApiDataToLeaderboardEntry(data.selected.traders);
  }, [data]);

  const fetchData = useCallback(async (fetchAllPeriods = false) => {
    const result = await execute({
      period: currentPeriod,
      limit: 20,
      fetchAll: fetchAllPeriods,
    });

    if (result?.selected) {
      if (fetchAllPeriods && result.data) {
        setAllPeriodsData(result.data);
      }
      setLastUpdated(new Date(result.selected.lastUpdated ?? Date.now()));
    }

    return result;
  }, [execute, currentPeriod]);

  const changePeriod = useCallback((newPeriod: Period) => {
    setCurrentPeriod(newPeriod);
    
    // Use cached data if available
    if (allPeriodsData?.[newPeriod]?.traders.length) {
      // Update with cached data immediately
      if (allPeriodsData[newPeriod].lastUpdated) {
        setLastUpdated(new Date(allPeriodsData[newPeriod].lastUpdated));
      }
    } else {
      // Fetch new data for this period
      fetchData(false);
    }
  }, [allPeriodsData, fetchData]);

  const refresh = useCallback(() => {
    const shouldFetchAll = allPeriodsData && Object.keys(allPeriodsData).length > 1;
    return fetchData(!!shouldFetchAll);
  }, [fetchData, allPeriodsData]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchData();
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData(true);
  }, []);

  return {
    leaderboardData,
    loading,
    error,
    currentPeriod,
    lastUpdated,
    autoRefresh,
    setAutoRefresh,
    changePeriod,
    refresh,
  };
};