import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useApi } from './useApi';
import type { TraderApiData, LeaderboardEntry, PeriodData, LeaderboardApiResponse } from '@/types';

export type Period = 'daily' | 'weekly' | 'monthly';

const convertApiDataToLeaderboardEntry = (data: TraderApiData[]): LeaderboardEntry[] => {
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
  
  // Track initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data, loading, error, execute } = useApi<LeaderboardApiResponse>('/api/getTopTraders', {
    dedupe: true,
    cacheTtl: 60000,
  });

  const leaderboardData = useMemo(() => {
    console.log('🔍 [useLeaderboard] Processing data:', data?.selected?.traders?.length || 0, 'traders');
    if (!data?.selected?.traders) {
      console.log('⚠️ [useLeaderboard] No traders data available');
      return [];
    }
    const converted = convertApiDataToLeaderboardEntry(data.selected.traders);
    console.log('✅ [useLeaderboard] Converted to leaderboard entries:', converted.length);
    return converted;
  }, [data]);

  const fetchData = useCallback(async (fetchAllPeriods = false) => {
    console.log(`🚀 [useLeaderboard] fetchData called - period: ${currentPeriod}, fetchAll: ${fetchAllPeriods}`);
    
    try {
      const result = await execute({
        period: currentPeriod,
        limit: 20,
        fetchAll: fetchAllPeriods,
      });

      console.log('📊 [useLeaderboard] API result:', {
        ok: result?.ok,
        selectedTradersCount: result?.selected?.traders?.length || 0,
        hasData: !!result?.data,
        period: result?.selected?.period
      });

      if (result?.selected) {
        if (fetchAllPeriods && result.data) {
          console.log('💾 [useLeaderboard] Updating all periods data');
          setAllPeriodsData(result.data);
        }
        
        const updatedTime = result.selected.lastUpdated ? new Date(result.selected.lastUpdated) : new Date();
        setLastUpdated(updatedTime);
        console.log('⏰ [useLeaderboard] Updated lastUpdated:', updatedTime.toISOString());
      }

      return result;
    } catch (err) {
      console.error('❌ [useLeaderboard] fetchData error:', err);
      throw err;
    }
  }, [execute, currentPeriod]);

  const changePeriod = useCallback((newPeriod: Period) => {
    console.log(`🔄 [useLeaderboard] Changing period from ${currentPeriod} to ${newPeriod}`);
    setCurrentPeriod(newPeriod);
    
    // Use cached data if available
    if (allPeriodsData?.[newPeriod]?.traders.length) {
      console.log('📂 [useLeaderboard] Using cached data for', newPeriod);
      if (allPeriodsData[newPeriod].lastUpdated) {
        setLastUpdated(new Date(allPeriodsData[newPeriod].lastUpdated));
      }
    } else {
      console.log('🔄 [useLeaderboard] Fetching fresh data for', newPeriod);
      fetchData(false);
    }
  }, [allPeriodsData, fetchData]);

  const refresh = useCallback(() => {
    console.log('🔄 [useLeaderboard] Manual refresh triggered');
    const shouldFetchAll = allPeriodsData && Object.keys(allPeriodsData).length > 1;
    return fetchData(!!shouldFetchAll);
  }, [fetchData, allPeriodsData]);

  // Initial fetch effect - FIXED: This should run immediately on mount
  useEffect(() => {
    if (isInitialized) return;
    
    console.log('🌟 [useLeaderboard] Initial data fetch starting');
    setIsInitialized(true);
    
    fetchData(true).catch(err => {
      console.error('❌ [useLeaderboard] Initial fetch failed:', err);
    });
  }, []); // Only run once on mount - fetchData is stable

  // handling period changes(ONLY after initialization)
  useEffect(() => {
    if (!isInitialized) return; // Don't run until initialized
    
    console.log(`🔄 [useLeaderboard] Period changed to ${currentPeriod}, checking for data`);
    
    if (!allPeriodsData?.[currentPeriod]?.traders?.length) {
      console.log(`📡 [useLeaderboard] No cached data for ${currentPeriod}, fetching...`);
      fetchData(false);
    }
  }, [currentPeriod, allPeriodsData, fetchData, isInitialized]);


  useEffect(() => {

    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    if (!autoRefresh || !isInitialized) {
      console.log('⏸️ [useLeaderboard] Auto-refresh disabled or not initialized');
      return;
    }
    
    console.log('▶️ [useLeaderboard] Starting auto-refresh (1 minute interval)');
    refreshIntervalRef.current = setInterval(() => {
      console.log('⏰ [useLeaderboard] Auto-refresh triggered');
      fetchData(false);
    }, 60000); // 1 minute

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh, fetchData, isInitialized]);

  // Debug effect
  useEffect(() => {
    console.log('🐛 [useLeaderboard] State update:', {
      loading,
      error: error!,
      leaderboardDataLength: leaderboardData.length,
      hasApiData: !!data,
      currentPeriod,
      lastUpdated: lastUpdated?.toISOString(),
      isInitialized
    });
  }, [loading, error, leaderboardData.length, data, currentPeriod, lastUpdated, isInitialized]);

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