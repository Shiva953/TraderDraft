'use client'

import Image from "next/image";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { useLogin, useLogout } from '@privy-io/react-auth';

import { Leaderboard } from "../components/leaderboard/Leaderboard";
import { ArrowUpRight } from "lucide-react";
import { Trending, type TrendingItem } from "../components/trending/Trending";
import Swap from "../components/traderProfile/swap";
import { PackSaleBannerNew } from "../components/packSale/PackSaleBannerNew";
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
import { useAppPhase } from "@/app/hooks/useAppPhase";
import { PackSalePhaseBanner } from "../components/phase/PackSalePhaseBanner";
import { PackRevealPhaseBanner } from "../components/phase/PackRevealPhaseBanner";

export default function Home() {
  const [showPackReveal, setShowPackReveal] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [showPackOpeningModal, setShowPackOpeningModal] = useState(false);
  const [userTP, setUserTP] = useState(0);

  const { login } = useLogin();
  const { logout } = useLogout();

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

  // Fetch current app phase (PACK_SALE, PACK_REVEAL, COMPETITION_LOOP)
  const { phaseData, loading: phaseLoading } = useAppPhase();

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
      const response = await fetch(`/api/user/getUserTotalTP?userWallet=${encodeURIComponent(fullWalletAddress)}`);
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

  const handlePackOpenSuccess = useCallback(() => {
    console.log('✅ Packs opened successfully - refreshing user data');
    refreshUserData();
    fetchUserTP();
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
      <div className="min-h-screen text-white flex items-center justify-center" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p>Loading wallet...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-neutral-100 antialiased">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,170,120,0.18), rgba(255,90,90,0.06) 45%, transparent 70%)",
        }}
      />
      {/* Subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      {/* Grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>\")",
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        {/* <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-full bg-[#ff8a5b] shadow-[0_0_12px_rgba(255,138,91,0.9)]"
          />
        </div> */}
        <span
          className="hidden text-xs text-neutral-500 sm:inline"
          style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}
        >
          v1.0 · SEASON 01
        </span>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-180px)] max-w-3xl flex-col items-center justify-center px-6 text-center">
        {/* <div
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-300 backdrop-blur"
          style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}
        >
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live · 1,284 traders drafting now
        </div> */}

        <h1
          className="text-balance text-[clamp(3rem,9vw,6.5rem)] font-normal leading-[0.95] tracking-tight"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Trader
          <em
            className="italic text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(180deg, #ffd9b8 0%, #ff8a5b 60%, #d65a3a 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
            }}
          >
            Draft
          </em>
          {/* <br /> in crypto. */}
        </h1>

        <p
          className="mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-neutral-400"
          style={{ fontFamily: "'Geist', sans-serif" }}
        >
        Draft your KOLs, hold their tokens, and ride the chaos to the top of the leaderboard.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4">
          <Button
            onClick={() => login()}
            className="group h-12 cursor-pointer rounded-full bg-white px-7 text-[16px] font-medium text-black shadow-[0_8px_30px_-8px_rgba(255,255,255,0.4)] transition-all duration-300 hover:bg-white hover:shadow-[0_12px_40px_-8px_rgba(255,255,255,0.55)] hover:-translate-y-0.5"
            style={{ fontFamily: "'Geist', sans-serif" }}
          >
            Sign in with Privy
            <ArrowUpRight className="ml-0.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Button>
          <p
            className="text-xs text-neutral-500"
            style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}
          >
            no wallet? no problem · email + passkey works
          </p>
        </div>

        {/* Stat ticker */}
        <div className="mt-16 grid w-full max-w-2xl grid-cols-3 divide-x divide-white/5 rounded-2xl border border-white/5 bg-white/[0.02] py-5 backdrop-blur">
          {[
            { k: "KOLs tracked", v: "412" },
            { k: "Avg. draft size", v: "5" },
            { k: "S1 prize pool", v: "$25k" },
          ].map((s) => (
            <div key={s.k} className="px-4 text-center">
              <div
                className="text-2xl text-neutral-100"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                {s.v}
              </div>
              <div
                className="mt-1 text-[10px] uppercase tracking-[0.18em] text-neutral-500"
                style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}
              >
                {s.k}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-neutral-600"
        style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}
      >
        <span>© TraderDraft</span>
        <span>Secured by Privy</span>
      </footer>
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
    <main className="w-full px-4 sm:px-6 lg:px-8 py-4">
      {/* Center-focused container with max width */}
      <div className="mx-auto max-w-7xl space-y-6">

      {/* Phase-Specific Banners */}
      {phaseLoading ? (
        <CompetitionBannerSkeleton />
      ) : phaseData?.phase === 'PACK_SALE' ? (
        // Pack Sale Phase (Day 0-7) - Show Pack Sale Banner
        <PackSalePhaseBanner
          endsAt={phaseData.endsAt}
          timeRemaining={phaseData.endsIn}
        />
      ) : phaseData?.phase === 'PACK_REVEAL' ? (
        // Pack Reveal Phase (Day 7-10) - Show Pack Reveal Banner
        <PackRevealPhaseBanner
          endsAt={phaseData.endsAt}
          timeRemaining={phaseData.endsIn}
        />
      ) : competitionLoading ? (
        <CompetitionBannerSkeleton />
      ) : competition?.status === 'ACTIVE' ? (
        // Competition Active - Show Competition Banner
        <CompetitionBanner
          endTime={competition.endDate}
          competitionId={competition.id}
        />
      ) : null}

      {/* KOL Leaderboard - Show during all phases except when loading */}
      {(phaseData?.phase === 'INITIALIZING' || phaseData?.phase === 'PACK_SALE' || phaseData?.phase === 'PACK_REVEAL' || phaseData?.phase === 'COMPETITION_ACTIVE' || phaseData?.phase === 'COMPETITION_RESULTS' || phaseData?.phase === 'WAITING_FOR_NEXT_COMPETITION') && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">
              {isCompetitionActive ? 'Trade KOLs and Earn TP' : 'Top KOLs'}
            </h2>
            <p className="text-neutral-400 text-sm mt-1">
              {isCompetitionActive ? 'Top traders of the week' : 'Discover and trade top performing traders'}
            </p>
          </div>

        <div id="home-leaderboard" className="rounded-2xl border border-neutral-800 p-4">
          <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
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
            showActions={true}
          />
        </div>
        </div>
      )}

      </div>
    </main>
  );
}