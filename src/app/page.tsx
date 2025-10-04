'use client'

import Image from "next/image";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { useLogin, useLogout } from '@privy-io/react-auth';

import { Leaderboard } from "../components/leaderboard/Leaderboard";
import { Trending, type TrendingItem } from "../components/trending/Trending";
import Swap from "../components/traderProfile/swap";
import { PackSaleBannerNew } from "../components/packSale/PackSaleBannerNew";
import { useDevBackgroundJobs } from "./hooks/useDevBackgroundJobs";
import UserPacks from "../components/packSale/UserPacks";
import { useUserData } from "./hooks/useUserData";
import MultiPackRevealSystem from "../components/packs/MultiPackRevealSystem";
import UserProfilePicture from "../components/profile/UserProfilePicture";
import { CompetitionBanner } from "../components/competition/CompetitionBanner";
import { CompetitionBannerSkeleton } from "../components/competition/CompetitionBannerSkeleton";
import { CompetitionResults } from "../components/competition/CompetitionResults";
import { Button } from "../components/ui/button";
import { PackOpeningModal } from "../components/competition/PackOpeningModal";

import { useWallet } from "./hooks/useWallet";
import { useUserPacks } from "./hooks/useUserPacks";
import { useLeaderboard } from "./hooks/useLeaderboard";
import { useActiveCompetition } from "./hooks/useActiveCompetition";

export default function Home() {
  const [showPackReveal, setShowPackReveal] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [showPackOpeningModal, setShowPackOpeningModal] = useState(false);
  const [userTP, setUserTP] = useState(0);

  const { login } = useLogin();
  const { logout } = useLogout();
  const { triggerManualUpdate, isTriggering } = useDevBackgroundJobs();

  const { 
    address: walletAddress, 
    fullAddress: fullWalletAddress, 
    isLoading: isWalletLoading, 
    isConnected: authenticated 
  } = useWallet();
  
  const {
    data: userPacksData,
  } = useUserPacks();

  const {
    leaderboardData,
    loading: leaderboardLoading,
    error: leaderboardError,
    currentPeriod,
    lastUpdated,
    autoRefresh,
    setAutoRefresh,
    changePeriod,
    refresh: refreshLeaderboard,
  } = useLeaderboard();

  const {
    competition,
    lastFinalized,
    loading: competitionLoading,
    isActive: isCompetitionActive
  } = useActiveCompetition();

  // Debug competition state
  useEffect(() => {
    console.log('🎯 [Page] Competition state:', {
      competition: competition ? {
        id: competition.id,
        status: competition.status,
        startDate: competition.startDate.toISOString(),
        endDate: competition.endDate.toISOString()
      } : null,
      loading: competitionLoading,
      isActive: isCompetitionActive
    });
  }, [competition, competitionLoading, isCompetitionActive]);

  // Track when we've successfully loaded data for the first time
  useEffect(() => {
    if (!hasInitiallyLoaded && leaderboardData && leaderboardData.length > 0) {
      console.log('✅ [Page] Initial leaderboard data loaded:', leaderboardData.length, 'entries');
      setHasInitiallyLoaded(true);
    }
  }, [leaderboardData, hasInitiallyLoaded]);

  // Debug logging for leaderboard state
  useEffect(() => {
    console.log('🐛 [Page] Leaderboard state:', {
      loading: leaderboardLoading,
      dataLength: leaderboardData?.length || 0,
      error: leaderboardError,
      hasInitiallyLoaded,
      currentPeriod
    });
  }, [leaderboardLoading, leaderboardData, leaderboardError, hasInitiallyLoaded, currentPeriod]);

  // Static data - could be moved to a separate hook if it becomes dynamic
  const trendingData: TrendingItem[] = [
    { name: "GAINZY", price: 0.056, deltaPct: 3.5 },
    { name: "ZELSER", price: 0.14, deltaPct: -6.2 },
    { name: "JADAWGS", price: 0.98, deltaPct: 2.7 },
  ];

  const handleOpenMultiPackReveal = useCallback(() => {
    setShowPackOpeningModal(true);
  }, []);

  // Fetch user TP when wallet is connected
  useEffect(() => {
    if (fullWalletAddress) {
      fetchUserTP();
    }
  }, [fullWalletAddress]);

  const fetchUserTP = async () => {
    if (!fullWalletAddress) return;
    try {
      const response = await fetch(`/api/getUserTotalTP?userWallet=${encodeURIComponent(fullWalletAddress)}`);
      if (response.ok) {
        const data = await response.json();
        setUserTP(data.totalTP || 0);
      }
    } catch (err) {
      console.error('Error fetching total TP:', err);
    }
  };

  const {
    packs: userPacks,
    tokenHoldings,
    tokenHoldingsCount,
    loading: userDataLoading,
    error: userDataError,
    refreshUserData
  } = useUserData(authenticated);

  const handleClosePackReveal = useCallback(() => {
    setShowPackReveal(false);
    refreshUserData();
  }, [refreshUserData]);

  const handleScrollToLeaderboard = useCallback(() => {
    const el = document.getElementById("home-leaderboard");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const getPeriodTitle = useCallback(() => {
    switch (currentPeriod) {
      case 'weekly': return 'Top Traders This Week';
      case 'monthly': return 'Top Traders This Month';
      default: return 'Top Traders Today';
    }
  }, [currentPeriod]);

  // Enhanced refresh handler with loading state management
  const handleRefresh = useCallback(async () => {
    console.log('🔄 [Page] Manual refresh triggered');
    try {
      await refreshLeaderboard();
      console.log('✅ [Page] Manual refresh completed');
    } catch (error) {
      console.error('❌ [Page] Manual refresh failed:', error);
    }
  }, [refreshLeaderboard]);

  if (isWalletLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p>Loading wallet...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <h1 className="text-3xl font-semibold">Welcome to Kolscan</h1>
          <button
            onClick={() => login()}
            className="mx-auto rounded-full px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg hover:scale-95 transition"
          >
            Login With Privy
          </button>
        </div>
      </main>
    );
  }

  if (showPackReveal) {
    return (
      <div className="relative">
        <MultiPackRevealSystem />
        <button
          onClick={handleClosePackReveal}
          className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 border border-white/20 text-white hover:bg-black/70"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4">
      <header className="text-center mt-12">
        <h1 className="text-4xl font-semibold text-neutral-100">Kolscan</h1>
      </header>

      {/* Competition Banner/Results - Below Kolscan heading */}
      {competitionLoading ? (
        <CompetitionBannerSkeleton />
      ) : competition?.status === 'ACTIVE' ? (
        // Active competition - show banner
        <CompetitionBanner
          endTime={competition.endDate}
          competitionId={competition.id}
        />
      ) : lastFinalized ? (
        // No active competition but have last finalized - show results
        <CompetitionResults
          competitionId={lastFinalized.id}
          nextCompetitionStart={null}
          competitionStartDate={lastFinalized.startDate}
          competitionEndDate={lastFinalized.endDate}
        />
      ) : null}

      {/* KOL Leaderboard - Only show during active competition */}
      {isCompetitionActive && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Trade KOLs and Earn TP</h2>
            <p className="text-neutral-400 text-sm mt-1">Top traders of the week</p>
          </div>

          <div id="home-leaderboard" className="rounded-2xl border border-neutral-800 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-400">Period:</span>
                  <select
                    value={currentPeriod}
                    onChange={(e) => changePeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
                    className="rounded bg-neutral-800 border border-neutral-600 text-white text-sm px-2 py-1"
                    disabled={leaderboardLoading}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-400">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded bg-neutral-800 border-neutral-600"
                    disabled={leaderboardLoading}
                  />
                  Auto-refresh (1min)
                </label>
              </div>
              <div className="flex items-center gap-3">
                {lastUpdated && (
                  <span className="text-xs text-neutral-500">
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
                <Button
                  onClick={handleRefresh}
                  disabled={leaderboardLoading}
                  size="sm"
                  variant="secondary"
                  className="bg-neutral-700 hover:bg-neutral-600 text-neutral-300"
                >
                  {leaderboardLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-neutral-300 mr-1"></div>
                      Refreshing...
                    </>
                  ) : (
                    '↻ Refresh'
                  )}
                </Button>
              </div>
            </div>

            <Leaderboard
              title={getPeriodTitle()}
              entries={leaderboardData || []}
              loading={leaderboardLoading || !leaderboardData || leaderboardData.length === 0}
              showActions={isCompetitionActive}
            />
          </div>
        </div>
      )}

    </main>
  );
}