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
import { Button } from "../components/ui/button";

import { useWallet } from "./hooks/useWallet";
import { useUserPacks } from "./hooks/useUserPacks";
import { useLeaderboard } from "./hooks/useLeaderboard";
import { useActiveCompetition } from "./hooks/useActiveCompetition";

export default function Home() {
  const [showPackReveal, setShowPackReveal] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  
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
    loading: competitionLoading,
    isActive: isCompetitionActive
  } = useActiveCompetition();

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
    setShowPackReveal(true);
  }, []);

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
    <main className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {/* TODO: Open buy packs with TP modal */}}
            className="bg-white text-black font-semibold cursor-pointer"
          >
            Buy Packs With TP
          </Button>
          <Button
            onClick={handleOpenMultiPackReveal}
            variant="outline"
            className="border-neutral-700 hover:bg-neutral-800 text-white font-semibold cursor-pointer"
          >
            Open Your Packs
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <UserProfilePicture
            walletAddress={walletAddress}
            userPrivyWalletAddress={fullWalletAddress}
            userPacks={userPacksData}
            tokenHoldings={tokenHoldings}
            tokenHoldingsCount={tokenHoldingsCount}
            userDataLoading={userDataLoading}
            userDataError={userDataError}
          />
          <Button
            onClick={logout}
            variant="outline"
            className="rounded-full border-white/20 hover:border-white/40 hover:bg-white/5"
          >
            Log Out
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <Button
              onClick={triggerManualUpdate}
              disabled={isTriggering}
              variant="outline"
              className="rounded-full border-orange-500/20 text-orange-300 hover:border-orange-500/40 hover:bg-orange-500/5 disabled:opacity-50"
            >
              {isTriggering ? 'Updating...' : 'Trigger Update'}
            </Button>
          )}
        </div>
      </div>

      <header className="text-center">
        <h1 className="text-4xl font-semibold text-neutral-100">Kolscan</h1>
      </header>

      {/* Competition Banner - Below Kolscan heading */}
      {competitionLoading ? (
        <CompetitionBannerSkeleton />
      ) : isCompetitionActive && competition ? (
        <CompetitionBanner
          endTime={competition.endDate}
          competitionId={competition.id}
        />
      ) : null}

      <PackSaleBannerNew
        onViewLeaderboard={handleScrollToLeaderboard}
        onSkipToReveal={handleOpenMultiPackReveal}
      />

      <UserPacks />

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

        {leaderboardError && (
          <div className="mb-4 rounded-lg bg-red-900/20 border border-red-800 p-3 text-sm text-red-400">
            <strong>Error:</strong> {leaderboardError}
            <button onClick={handleRefresh} className="ml-2 text-red-300 underline hover:text-red-200">
              Retry
            </button>
          </div>
        )}

        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 rounded-lg bg-blue-900/20 border border-blue-800 p-3 text-sm text-blue-400">
            <strong>Debug:</strong> Loading: {leaderboardLoading.toString()}, 
            Data Length: {leaderboardData?.length || 0}, 
            Has Initially Loaded: {hasInitiallyLoaded.toString()},
            Period: {currentPeriod}
          </div>
        )}

        <Leaderboard
          title={getPeriodTitle()}
          entries={leaderboardData || []}
          loading={leaderboardLoading && !hasInitiallyLoaded} // Only show loading for initial load
          showActions={isCompetitionActive} // Show Buy/Sell buttons when competition is active
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Trending items={trendingData} />
        <Swap />
      </div>
    </main>
  );
}