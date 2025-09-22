'use client'

import Image from "next/image";
import { Leaderboard, type LeaderboardEntry } from "../components/leaderboard/Leaderboard";
import { Trending, type TrendingItem } from "../components/trending/Trending";
import Swap from "../components/traderProfile/swap";
import { useRouter } from "next/router";
import {PrivyProvider, useLogin, usePrivy, useSolanaWallets, useLoginWithOAuth, useLogout} from '@privy-io/react-auth';
import { useEffect, useState, useCallback } from "react";
import {PackSaleBannerNew} from "../components/packSale/PackSaleBannerNew";
import { useDevBackgroundJobs } from "./hooks/useDevBackgroundJobs";
import { useUserData } from "./hooks/useUserData";
import UserPacks from "../components/packSale/UserPacks";
import MultiPackRevealSystem from "../components/packs/MultiPackRevealSystem";
import UserProfilePicture from "../components/profile/UserProfilePicture";

interface TraderData {
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

interface PeriodData {
  traders: TraderData[];
  totalTraders: number;
  lastUpdated: string | null;
  period: string;
}

interface ApiResponse {
  ok: boolean;
  message: string;
  period: string;
  timestamp: string;
  topTradersForDay: TraderData[];
  data: {
    daily: PeriodData;
    weekly: PeriodData;
    monthly: PeriodData;
  };
  selected: PeriodData;
}

function convertApiDataToLeaderboardEntry(data: TraderData[]): LeaderboardEntry[] {
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
}

export default function Home() {
  const fallbackLeaderboardData: LeaderboardEntry[] = [
    { rank: 1, handle: "gainzy", pnl: "+37.22 SOL", winRate: "75%", traderUrl: "/traders/gainzy", xUrl: "https://x.com/gainzy" },
    { rank: 2, handle: "a31g", pnl: "+23.10 SOL", winRate: "68%", traderUrl: "/traders/a31g", xUrl: "https://x.com/a31g" },
    { rank: 3, handle: "xr7q69", pnl: "+10.46 SOL", winRate: "82%", traderUrl: "/traders/xr7q69", xUrl: "https://x.com/xr7q69" },
    { rank: 4, handle: "pdawg", pnl: "+17.98 SOL", winRate: "71%", traderUrl: "/traders/gainzy", xUrl: "https://x.com/gainzy" },
  ];

  const trendingData: TrendingItem[] = [
    { name: "GAINZY", price: 0.056, deltaPct: 3.5 },
    { name: "ZELSER", price: 0.14, deltaPct: -6.2 },
    { name: "JADAWGS", price: 0.98, deltaPct: 2.7 },
  ];

  const [walletAddress, setWalletAddress] = useState('');
  const [fullWalletAddress, setFullWalletAddress] = useState('');
  const [isWalletLoading, setIsWalletLoading] = useState(true);

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(fallbackLeaderboardData);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [allPeriodsData, setAllPeriodsData] = useState<ApiResponse['data'] | null>(null);

  // Only multi-pack reveal
  const [showPackReveal, setShowPackReveal] = useState(false);

  const { triggerManualUpdate, isTriggering } = useDevBackgroundJobs();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval] = useState(60000);

  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();
  const { wallets } = useSolanaWallets();
  const { logout } = useLogout();

  const {
    packs: userPacks,
    tokenHoldings,
    tokenHoldingsCount,
    loading: userDataLoading,
    error: userDataError,
    refreshUserData
  } = useUserData(authenticated);

  const fetchLeaderboardData = useCallback(async (fetchAllPeriods = false) => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const response = await fetch('/api/getTopTraders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: currentPeriod, limit: 20, fetchAll: fetchAllPeriods }),
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      if (data.ok && data.selected?.traders?.length) {
        setLeaderboardData(convertApiDataToLeaderboardEntry(data.selected.traders));
        if (fetchAllPeriods && data.data) setAllPeriodsData(data.data);
        setLastUpdated(new Date(data.selected.lastUpdated ?? Date.now()));
      } else if (!leaderboardData.length) {
        setLeaderboardData(fallbackLeaderboardData);
      }
    } catch (err) {
      setLeaderboardError(err instanceof Error ? err.message : 'Failed to fetch data');
      if (!leaderboardData.length) setLeaderboardData(fallbackLeaderboardData);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [currentPeriod, leaderboardData.length]);

  const handleRefresh = useCallback(() => {
    const shouldFetchAll = allPeriodsData && Object.keys(allPeriodsData).length > 1;
    fetchLeaderboardData(!!shouldFetchAll);
  }, [fetchLeaderboardData, allPeriodsData]);

  const handlePeriodChange = useCallback(async (newPeriod: 'daily' | 'weekly' | 'monthly') => {
    setCurrentPeriod(newPeriod);
    if (allPeriodsData?.[newPeriod]?.traders.length) {
      setLeaderboardData(convertApiDataToLeaderboardEntry(allPeriodsData[newPeriod].traders));
      if (allPeriodsData[newPeriod].lastUpdated)
        setLastUpdated(new Date(allPeriodsData[newPeriod].lastUpdated));
    } else {
      await fetchLeaderboardData(false);
    }
  }, [allPeriodsData, fetchLeaderboardData]);

  useEffect(() => {
    if (!ready || !authenticated) {
      setWalletAddress('');
      setIsWalletLoading(false);
      return;
    }
    const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
    if (embeddedWallet?.address) {
      setWalletAddress(embeddedWallet.address.substring(0, 6));
      setFullWalletAddress(embeddedWallet.address);
      setIsWalletLoading(false);
    }
  }, [wallets, ready, authenticated]);

  useEffect(() => {
    if (authenticated && ready) fetchLeaderboardData(true);
  }, [authenticated, ready]);

  useEffect(() => {
    if (!autoRefresh || !authenticated) return;
    const interval = setInterval(() => fetchLeaderboardData(), refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, authenticated, refreshInterval, fetchLeaderboardData]);

  const handleOpenMultiPackReveal = () => setShowPackReveal(true);
  const handleClosePackReveal = () => {
    setShowPackReveal(false);
    refreshUserData();
  };

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

  if (!ready) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p>Loading...</p>
        </div>
      </div>
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

  const getPeriodTitle = () =>
    currentPeriod === 'weekly'
      ? 'Top Traders This Week'
      : currentPeriod === 'monthly'
      ? 'Top Traders This Month'
      : 'Top Traders Today';

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <button
          onClick={handleOpenMultiPackReveal}
          className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white hover:scale-105 transition"
        >
          REVEAL ALL PACKS
        </button>

        <div className="flex items-center gap-3">
          {isWalletLoading ? (
            <button className="rounded-full border border-white/20 px-4 py-2 text-sm text-white">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                Loading...
              </div>
            </button>
          ) : (
            <UserProfilePicture
              walletAddress={walletAddress}
              userPrivyWalletAddress={fullWalletAddress}
              userPacks={userPacks}
              tokenHoldings={tokenHoldings}
              tokenHoldingsCount={tokenHoldingsCount}
              userDataLoading={userDataLoading}
              userDataError={userDataError}
            />
          )}
          <button onClick={logout} className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-white/40 hover:bg-white/5">
            Log Out
          </button>
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={triggerManualUpdate}
              disabled={isTriggering}
              className="rounded-full border border-orange-500/20 px-4 py-2 text-sm text-orange-300 hover:border-orange-500/40 hover:bg-orange-500/5 disabled:opacity-50"
            >
              {isTriggering ? 'Updating...' : 'Trigger Update'}
            </button>
          )}
        </div>
      </div>

      <header className="text-center">
        <h1 className="text-4xl font-semibold text-neutral-100">Kolscan</h1>
      </header>

      <PackSaleBannerNew
        onViewLeaderboard={() => {
          const el = document.getElementById("home-leaderboard");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
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
                onChange={(e) => handlePeriodChange(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="rounded bg-neutral-800 border border-neutral-600 text-white text-sm px-2 py-1"
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
            <button
              onClick={handleRefresh}
              disabled={leaderboardLoading}
              className="rounded bg-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-600 disabled:opacity-50 flex items-center gap-1"
            >
              {leaderboardLoading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {leaderboardError && (
          <div className="mb-4 rounded-lg bg-red-900/20 border border-red-800 p-3 text-sm text-red-400">
            <strong>Error:</strong> {leaderboardError}
            <button onClick={handleRefresh} className="ml-2 text-red-300 underline">
              Retry
            </button>
          </div>
        )}

        <Leaderboard title={getPeriodTitle()} entries={leaderboardData} loading={leaderboardLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Trending items={trendingData} />
        <Swap />
      </div>
    </main>
  );
}
