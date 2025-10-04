"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowDown, Users, ExternalLink } from "lucide-react";
import { useSolanaWallets } from "@privy-io/react-auth";
import MeteoraSwapModal from "@/components/swap/MeteoraSwapModal";
import { useActiveCompetition } from "@/app/hooks/useActiveCompetition";

interface TraderPageProps {
  params: { kol: string };
}

interface TraderData {
  id: string;
  rank: number;
  name: string;
  address: string;
  pnl: string;
  winRate: number;
  avatarUrl: string;
  xUrl: string;
  tokenMintAddress: string;
  poolAddress: string;
  period: string;
  tokenPrice?: string;
  priceChange24h?: string;
  priceChange24hPercent?: number;
}

interface KOLData {
  name: string;
  daily: TraderData | null;
  weekly: TraderData | null;
  monthly: TraderData | null;
}

interface TokenHolding {
  ticker: string;
  name: string;
  balance: string;
  mintAddress: string;
  poolAddress?: string;
  tokenPrice?: string;
  priceChange24h?: string;
  priceChange24hPercent?: number;
}

export default function TraderPage({ params }: TraderPageProps) {
  const [kolData, setKOLData] = useState<KOLData | null>(null);
  const [userShares, setUserShares] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [activeCompetitionId, setActiveCompetitionId] = useState<string | null>(null);
  const {wallets} = useSolanaWallets()
  // DISABLE competition hook on KOL page to prevent API clash with swap requests
  const { competition, isActive } = useActiveCompetition({ enabled: false });

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const userPrivyWalletAddress = embeddedWallet?.address;

  // Fetch active competition ID separately (lightweight, no polling)
  useEffect(() => {
    const fetchActiveCompetition = async () => {
      try {
        const response = await fetch('/api/competitions/start', { method: 'GET' });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.competition && data.competition.status === 'ACTIVE') {
            setActiveCompetitionId(data.competition.id);
            console.log(`🏆 [KOLPage] Active competition: ${data.competition.id}`);
          } else {
            setActiveCompetitionId(null);
            console.log('ℹ️ [KOLPage] No active competition');
          }
        }
      } catch (error) {
        console.warn('⚠️ [KOLPage] Could not fetch competition:', error);
        setActiveCompetitionId(null);
      }
    };

    fetchActiveCompetition();
  }, []); // Only run once on mount

  // Single unified fetch for ALL KOL page data with retry logic
  useEffect(() => {
    const fetchAllKOLPageData = async (retryCount = 0) => {
      const MAX_RETRIES = 5;
      const RETRY_DELAY = 2000;

      try {
        setLoading(true);
        const awaitedParams = await params;

        console.log(`🔄 [KOLPage] Fetching all data (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

        const response = await fetch('/api/getKOLPageData', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            kolName: awaitedParams.kol,
            userWalletAddress: userPrivyWalletAddress
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch KOL data`);
        }

        const data = await response.json();
        console.log(`✅ [KOLPage] Data fetched successfully`);

        setKOLData(data.data.kolData);

        // Only update userShares if it's a valid non-zero value, or if we're on the first load
        const newShares = data.data.userShares;
        if (newShares !== "0" || userShares === "0") {
          setUserShares(newShares);
        } else {
          console.warn(`⚠️ [KOLPage] Received 0 shares but current value is ${userShares}, keeping current value`);
        }

        setError(null);
        setLoading(false);

      } catch (err) {
        console.error(`❌ [KOLPage] Error fetching data (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, err);

        // Retry logic
        if (retryCount < MAX_RETRIES) {
          console.log(`🔄 [KOLPage] Retrying in ${RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return fetchAllKOLPageData(retryCount + 1);
        } else {
          console.error(`❌ [KOLPage] Max retries reached`);
          setError(err instanceof Error ? err.message : 'Failed to fetch KOL data');
          setLoading(false);
        }
      }
    };

    fetchAllKOLPageData();
  }, [params, userPrivyWalletAddress]);


  // Get the most recent data (prefer daily, then weekly, then monthly)
  const getCurrentData = () => {
    if (!kolData) return null;
    return kolData.daily || kolData.weekly || kolData.monthly;
  };

  const currentData = getCurrentData();

  const handleBuyClick = () => {
    console.log("Buy button clicked - opening Meteora swap modal");
    setIsSwapModalOpen(true);
  };

  const handleSwapSuccess = () => {
    console.log("✅ Swap successful - user can manually refresh the page to see updated shares");
    // Don't refresh automatically to avoid request clashes
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="flex">
          {/* Left Panel Skeleton */}
          <div className="w-1/2 p-8 flex flex-col justify-between">
            <div className="mb-12">
              {/* Back button skeleton */}
              <div className="w-6 h-6 bg-gray-700 rounded mb-8 animate-pulse"></div>

              {/* Name skeleton */}
              <div className="mb-8">
                <div className="h-16 bg-gray-700 rounded w-3/4 mb-4 animate-pulse"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2 mb-2 animate-pulse"></div>
              </div>

              {/* Price skeleton */}
              <div className="mb-8">
                <div className="flex items-center space-x-4 mb-2">
                  <div className="w-6 h-6 bg-gray-700 rounded-full animate-pulse"></div>
                  <div className="h-12 bg-gray-700 rounded w-48 animate-pulse"></div>
                  <div className="h-6 bg-gray-700 rounded w-20 animate-pulse"></div>
                </div>
              </div>

              {/* Action buttons skeleton */}
              <div className="flex space-x-4">
                <div className="h-12 bg-gray-700 rounded-full w-32 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Right Panel Skeleton */}
          <div className="w-1/2 p-8 space-y-6">
            {/* Profile card skeleton */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-8 h-80 animate-pulse">
              <div className="flex items-center justify-center h-full">
                <div className="w-64 h-64 rounded-3xl bg-gray-600"></div>
              </div>
            </div>

            {/* Stats cards skeleton */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-6 animate-pulse">
                <div className="h-4 bg-gray-600 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-600 rounded w-16"></div>
              </div>
              <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-6 animate-pulse">
                <div className="h-4 bg-gray-600 rounded w-32 mb-2"></div>
                <div className="h-6 bg-gray-600 rounded w-24"></div>
              </div>
            </div>

            {/* Your Shares skeleton */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-gray-600 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-600 rounded w-20"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !currentData) {
    return (
      <main className="min-h-screen bg-black">
        <div className="text-center pt-20">
          <h1 className="text-3xl font-bold mb-4 text-red-400">Error</h1>
          <p className="text-neutral-400">{error || 'No data found for this trader'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="flex">
        {/* Left Panel */}
        <div className="w-1/2 p-8 flex flex-col justify-between">
          {/* Header with back arrow */}
          <div className="mb-12">
            <button 
              onClick={() => window.history.back()}
              className="text-white mb-8 hover:text-gray-300 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            
            {/* Trader Name and Details */}
            <div className="mb-8">
              <h1 className="text-6xl font-bold mb-4">{currentData.name}</h1>
              <a 
                href={`https://solscan.io/account/${currentData.tokenMintAddress}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-sm text-gray-400 hover:text-gray-300 transition-colors mb-2"
              >
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span>{currentData.tokenMintAddress?.slice(0, 8)}...{currentData.tokenMintAddress?.slice(-6)}</span>
                <ExternalLink size={14} />
              </a>
            </div>

            {/* Price and Change */}
            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-xs">≡</span>
                </div>
                <span className="text-5xl font-bold">
                  {'0.000062'}
                </span>
                <span className={`text-lg flex items-center ${(currentData.priceChange24hPercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  <ArrowDown className={`inline mr-1 ${(currentData.priceChange24hPercent || 0) >= 0 ? 'rotate-180' : ''}`} size={20} />
                  {Math.abs(currentData.priceChange24hPercent || 0).toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={handleBuyClick}
                disabled={!currentData?.poolAddress || !currentData?.tokenMintAddress}
                className="cursor-pointer bg-green-500 text-white px-8 py-3 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
              >
                Buy
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Profile and Stats */}
        <div className="w-1/2 p-8 space-y-6">
          {/* Profile Image Card */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-8 flex items-center justify-center relative h-80">
            <div className="w-64 h-64 rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src={currentData.avatarUrl || "/default-avatar.jpg"} 
                alt={currentData.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'%3E%3Crect width='256' height='256' fill='%23374151'/%3E%3Ctext x='128' y='128' text-anchor='middle' dy='0.3em' fill='%239CA3AF' font-size='64'%3E%F0%9F%91%A4%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
            
            {/* PnL in top right of profile card */}
            <div className="absolute top-6 right-6 text-right">
              <div className="mb-1">
                <span className="text-white/70 text-xs">PnL</span>
              </div>
              <div className={`text-xl font-bold ${currentData.pnl.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                {currentData.pnl.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Winrate Card */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-6">
              <div className="mb-2">
                <span className="text-white/70 text-sm">Win Rate</span>
              </div>
              <div className="text-white text-2xl font-bold">
                {currentData.winRate?.toFixed(1)}%
              </div>
            </div>

            {/* Supply Card */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-6">
              <div className="mb-2">
                <span className="text-white/70 text-sm">Active / Circ. Supply</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="text-white/60" size={16} />
                <span className="text-white text-lg font-bold">599.8k</span>
                <span className="text-white/60">/1B</span>
              </div>
            </div>
          </div>

          {/* Your Shares Card */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-6">
            <div className="mb-2">
              <span className="text-white/70 text-sm">Your Shares</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="text-white/60" size={20} />
              <span className="text-white text-2xl font-bold">
                {userShares}
              </span>
              {userShares !== "0" && (
                <span className="text-green-400 text-sm">tokens</span>
              )}
            </div>
            {userShares === "0" && (
              <p className="text-white/50 text-xs mt-1">No holdings found</p>
            )}
          </div>
        </div>
      </div>

      {/* Meteora Swap Modal */}
      {currentData && (
        <MeteoraSwapModal
          isOpen={isSwapModalOpen}
          onClose={() => setIsSwapModalOpen(false)}
          kolName={currentData.name}
          kolTokenMint={currentData.tokenMintAddress}
          poolAddress={currentData.poolAddress}
          onSwapSuccess={handleSwapSuccess}
          currentUserShares={userShares}
          traderId={currentData.id}
          activeCompetitionId={activeCompetitionId}
        />
      )}
    </main>
  );
}