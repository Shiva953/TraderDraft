'use client'

import Image from "next/image";
import { Leaderboard, type LeaderboardEntry } from "../components/Leaderboard";
import { Trending, type TrendingItem } from "../components/Trending";
import Swap from "../components/swap";
import { useRouter } from "next/router";
import {PrivyProvider, useLogin, usePrivy, useSolanaWallets, useLoginWithOAuth, useLogout} from '@privy-io/react-auth';
import { useEffect, useState, useCallback } from "react";
import {PackSaleBannerNew} from "../components/PackSaleBannerNew";
import { useDevBackgroundJobs } from "../hooks/useDevBackgroundJobs";
import { useUserData } from "./hooks/useUserData";
import UserPacks from "../components/UserPacks";
import PackRevealSystem from "../components/PackRevealSystem"; // Individual pack reveal
import MultiPackRevealSystem from "../components/MultiPackRevealSystem"; // Import the new multi-pack system
import { PackRevealBanner } from "@/components/PackRevealBanner";
import UserProfilePicture from "../components/UserProfilePicture";

// Updated interface to match backend data
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
  topTradersForDay: TraderData[]; // For backward compatibility
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
      avatarUrl: trader.avatarUrl || undefined,
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

  // RUN A BG JOB/API REQUEST to the /api/updateDBPeriodically endpoint which runs the scraping job again and updates the DB with new data

  const [walletAddress, setWalletAddress] = useState('');
  const [fullWalletAddress, setFullWalletAddress] = useState('');
  const [isWalletLoading, setIsWalletLoading] = useState(true);

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(fallbackLeaderboardData);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [allPeriodsData, setAllPeriodsData] = useState<ApiResponse['data'] | null>(null);

  // UPDATED PACK REVEAL STATE - now supports both individual and multi-pack
  const [showPackReveal, setShowPackReveal] = useState<'none' | 'individual' | 'multi'>('none');

  const { triggerManualUpdate, isTriggering } = useDevBackgroundJobs();

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval] = useState(60000); // 1 minute

  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();
  const { wallets } = useSolanaWallets();
  const { logout } = useLogout();

  // Use the new useUserData hook
  const {
    packs: userPacks,
    tokenHoldings,
    tokenHoldingsCount,
    loading: userDataLoading,
    error: userDataError,
    refreshUserData
  } = useUserData(authenticated);

  console.log("Current state:", { ready, authenticated, wallets: wallets.length, user });

  const fetchLeaderboardData = useCallback(async (fetchAllPeriods = false) => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    
    try {
      console.log(`🔵 [PAGE] Fetching ${fetchAllPeriods ? 'all periods' : currentPeriod} data...`);
      
      const response = await fetch('/api/getTopTraders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          period: currentPeriod, 
          limit: 20,
          fetchAll: fetchAllPeriods 
        }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log("✅ [PAGE] Received data:", data);
      
      if (data.ok && data.selected && data.selected.traders && data.selected.traders.length > 0) {
        const convertedData = convertApiDataToLeaderboardEntry(data.selected.traders);
        setLeaderboardData(convertedData);
        
        // Only update all periods data if we fetched it
        if (fetchAllPeriods && data.data) {
          setAllPeriodsData(data.data);
        }
        
        // Set last updated from the selected period's data
        if (data.selected.lastUpdated) {
          setLastUpdated(new Date(data.selected.lastUpdated));
        } else {
          setLastUpdated(new Date());
        }
        
        console.log("✅ [PAGE] Converted data:", convertedData);
      } else {
        console.warn("⚠️ [PAGE] No data received, using fallback");
        if (leaderboardData.length === 0) {
          setLeaderboardData(fallbackLeaderboardData);
        }
      }
    } catch (err) {
      console.error('❌ [PAGE] Failed to fetch leaderboard data:', err);
      setLeaderboardError(err instanceof Error ? err.message : 'Failed to fetch data');
      
      if (leaderboardData.length === 0) {
        setLeaderboardData(fallbackLeaderboardData);
      }
    } finally {
      setLeaderboardLoading(false);
    }
  }, [currentPeriod, leaderboardData.length]);

  // Update refresh handler to be smarter about what to fetch
  const handleRefresh = useCallback(() => {
    // If we have cached data for other periods, refresh all
    // Otherwise, just refresh the current period
    const shouldFetchAll = allPeriodsData && Object.keys(allPeriodsData).length > 1;
    fetchLeaderboardData(shouldFetchAll!);
  }, [fetchLeaderboardData, allPeriodsData]);

  // switch periods using cached data when available
  // Enhanced period change handler that fetches data if not cached
  const handlePeriodChange = useCallback(async (newPeriod: 'daily' | 'weekly' | 'monthly') => {
    const oldPeriod = currentPeriod;
    setCurrentPeriod(newPeriod);
    
    // If we have cached data for this period, use it immediately
    if (allPeriodsData && allPeriodsData[newPeriod] && allPeriodsData[newPeriod].traders.length > 0) {
      const convertedData = convertApiDataToLeaderboardEntry(allPeriodsData[newPeriod].traders);
      setLeaderboardData(convertedData);
      
      if (allPeriodsData[newPeriod].lastUpdated) {
        setLastUpdated(new Date(allPeriodsData[newPeriod].lastUpdated));
      }
      
      console.log(`✅ [PAGE] Switched to ${newPeriod} using cached data`);
    } else {
      // No cached data, fetch it
      console.log(`🔄 [PAGE] No cached data for ${newPeriod}, fetching...`);
      
      try {
        setLeaderboardLoading(true);
        const response = await fetch('/api/getTopTraders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            period: newPeriod, 
            limit: 20,
            fetchAll: false // Only fetch the specific period
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.selected && data.selected.traders) {
            const convertedData = convertApiDataToLeaderboardEntry(data.selected.traders);
            setLeaderboardData(convertedData);
            
            if (data.selected.lastUpdated) {
              setLastUpdated(new Date(data.selected.lastUpdated));
            }
            
            // Cache this data for future use
            if (allPeriodsData) {
              setAllPeriodsData({
                ...allPeriodsData,
                [newPeriod]: {
                  traders: data.selected.traders,
                  totalTraders: data.selected.totalTraders,
                  lastUpdated: data.selected.lastUpdated,
                  period: newPeriod
                }
              });
            }
          }
        } else {
          throw new Error(`Failed to fetch ${newPeriod} data`);
        }
      } catch (error) {
        console.error(`❌ [PAGE] Failed to fetch ${newPeriod} data:`, error);
        setLeaderboardError(`Failed to load ${newPeriod} data`);
        // Revert to old period on error
        setCurrentPeriod(oldPeriod);
      } finally {
        setLeaderboardLoading(false);
      }
    }
  }, [allPeriodsData, currentPeriod]);

  useEffect(() => {
    if (!ready || !authenticated) {
      setWalletAddress('');
      setIsWalletLoading(false);
      return;
    }

    const findWallet = () => {
      console.log("Looking for wallets...", wallets);
      
      const embeddedWallet = wallets.find(
        (w) => w.walletClientType === 'privy'
      );

      if (embeddedWallet && embeddedWallet.address) {
        console.log('Found embedded wallet:', embeddedWallet);
        console.log("Does the embedded wallet address exist: ", embeddedWallet.address)
        console.log("Am I able to substring it: ", embeddedWallet.address.substring(0, 6))
        console.log("Wallet address(before)", walletAddress)
        const shortAddress = embeddedWallet.address.substring(0, 6)
        setWalletAddress(shortAddress);
        setFullWalletAddress(embeddedWallet.address); // Add this line
        console.log("Wallet address(after)", walletAddress)
        console.log("WALLET LOADING STATE(BEFORE): ",isWalletLoading)
        setIsWalletLoading(false);
        console.log("WALLET LOADING STATE(AFTER): ",isWalletLoading)
        return true;
      }
      return false;
    };

    findWallet();
  }, [wallets, walletAddress, isWalletLoading]);

  // Update initial fetch to get all periods data
  useEffect(() => {
    if (authenticated && ready) {
      console.log("🔵 [PAGE] User authenticated, fetching initial data (all periods)");
      fetchLeaderboardData(true); // Fetch all periods on initial load
    }
  }, [authenticated, ready]);

  useEffect(() => {
    if (!autoRefresh || !authenticated) return;

    console.log("🔵 [PAGE] Setting up auto-refresh interval");
    const interval = setInterval(() => {
      console.log("🔄 [PAGE] Auto-refreshing leaderboard data");
      fetchLeaderboardData();
    }, refreshInterval);

    return () => {
      console.log("🔵 [PAGE] Clearing auto-refresh interval");
      clearInterval(interval);
    };
  }, [autoRefresh, authenticated, refreshInterval, fetchLeaderboardData]);

  // UPDATED PACK REVEAL HANDLERS
  const handleViewMultiPackReveal = () => {
    setShowPackReveal('multi');
  };

  const handleViewIndividualPackReveal = () => {
    setShowPackReveal('individual');
  };

  // Update the handleClosePackReveal function to refresh user data
  const handleClosePackReveal = () => {
    setShowPackReveal('none');
    // Refresh user data when closing the reveal system
    refreshUserData();
  };

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Welcome to Kolscan</h1>
          </div>

          <button
              onClick={() => login()}
              className="group relative flex mx-auto items-center justify-center gap-3 rounded-full px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg shadow-rose-500/30 transition-all duration-200 hover:shadow-rose-500/50 focus:outline-none focus:ring-4 focus:ring-rose-400/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <span>Login With Privy</span>
            </button>
        </div>
      </main>
    );
  }
  
  if (!ready) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const getPeriodTitle = () => {
    switch (currentPeriod) {
      case 'weekly':
        return 'Top Traders This Week';
      case 'monthly':
        return 'Top Traders This Month';
      case 'daily':
      default:
        return 'Top Traders Today';
    }
  };

  // UPDATED PACK REVEAL RENDERING LOGIC
  if (showPackReveal !== 'none') {
    return (
      <div className="relative">
        {showPackReveal === 'multi' ? (
          <MultiPackRevealSystem />
        ) : (
          <PackRevealSystem />
        )}
        
        {/* CLOSE BUTTON */}
        <button
          onClick={handleClosePackReveal}
          className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 border border-white/20 text-white hover:bg-black/70 transition-all duration-200 flex items-center justify-center"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        {/* UPDATED PACK REVEAL BUTTONS */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleViewMultiPackReveal}
            className="rounded-lg cursor-pointer bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-4 py-2 text-sm font-semibold text-white hover:scale-105 transition-all duration-200"
          >
            REVEAL ALL PACKS
          </button>
          
          {/* INDIVIDUAL PACK REVEAL FOR TESTING */}
          <button 
            onClick={handleViewIndividualPackReveal}
            className="rounded-lg cursor-pointer bg-gray-600 hover:bg-gray-700 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200"
          >
            Test Individual Pack
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isWalletLoading ? (
            <button className="rounded-full border border-white/20 px-4 py-2 text-sm text-white">
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                Loading...
              </span>
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
          <button onClick={logout} className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-white/40 hover:bg-white/5 transition-all duration-200 cursor-pointer">
            Log Out
          </button>
          {process.env.NODE_ENV === 'development' && (
            <button 
              onClick={triggerManualUpdate} 
              disabled={isTriggering}
              className="rounded-full border border-orange-500/20 px-4 py-2 text-sm text-orange-300 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              {isTriggering ? 'Updating...' : 'Trigger Update'}
            </button>
          )}
        </div>
      </div>

      <header className="text-center">
        <h1 className="text-4xl font-semibold text-neutral-100">Kolscan</h1>
      </header>

      {/* UPDATED PACK SALE BANNER TO TRIGGER MULTI-PACK REVEAL */}
      <PackSaleBannerNew 
        onViewLeaderboard={() => {
          const el = document.getElementById("home-leaderboard");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onSkipToReveal={handleViewMultiPackReveal}
        onTestSinglePackReveal={handleViewIndividualPackReveal}
      />

      <UserPacks />

      <div id="home-leaderboard" className="rounded-2xl border border-neutral-800 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Period selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-400">Period:</span>
              <select
                value={currentPeriod}
                onChange={(e) => handlePeriodChange(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="rounded bg-neutral-800 border border-neutral-600 text-white text-sm px-2 py-1 focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
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
                className="rounded bg-neutral-800 border-neutral-600 text-rose-500 focus:ring-rose-500 focus:ring-2"
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
              className="rounded bg-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-600 disabled:opacity-50 transition-all duration-200 flex items-center gap-1"
            >
              {leaderboardLoading ? (
                <svg 
                  className="animate-spin h-3 w-3" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                '↻'
              )}
              {leaderboardLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {leaderboardError && (
          <div className="mb-4 rounded-lg bg-red-900/20 border border-red-800 p-3 text-sm text-red-400">
            <strong>Error:</strong> {leaderboardError}
            <button
              onClick={handleRefresh}
              className="ml-2 text-red-300 hover:text-red-200 underline"
            >
              Retry
            </button>
          </div>
        )}

        <Leaderboard 
          title={getPeriodTitle()}
          entries={leaderboardData}
          loading={leaderboardLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Trending items={trendingData} />
        <Swap />
      </div>
    </main>
  );
}