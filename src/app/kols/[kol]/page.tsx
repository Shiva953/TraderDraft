"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowDown, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { useSolanaWallets, usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import MeteoraSwapModal from "@/components/swap/MeteoraSwapModal";
import { useActiveCompetition } from "@/app/hooks/useActiveCompetition";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
  liquidityUsd?: number;
  marketCap?: number;
  totalSupply?: number;
  circulatingSupply?: number;
  holdersCount?: number;
  volume24h?: number;
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
  const [swapMode, setSwapMode] = useState<'buy' | 'sell'>('buy');
  const [activeCompetitionId, setActiveCompetitionId] = useState<string | null>(null);
  const [resolvedKolName, setResolvedKolName] = useState<string | null>(null);
  const {wallets} = useSolanaWallets()
  const { authenticated, ready } = usePrivy();
  const router = useRouter();
  // DISABLE competition hook on KOL page to prevent API clash with swap requests
  const { competition, isActive } = useActiveCompetition({ enabled: false });

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const userPrivyWalletAddress = embeddedWallet?.address;

  // Redirect to home if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      console.log('🔒 [KOLPage] User not authenticated, redirecting to home');
      router.push('/');
    }
  }, [authenticated, ready, router]);

  // Resolve params once on mount (Next.js 15 async params fix)
  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setResolvedKolName(resolved.kol); // This is now the ticker
    };
    resolveParams();
  }, []); // Only run once - empty dependency array

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
    if (!resolvedKolName) return; // Wait for kolTicker to be resolved

    const fetchAllKOLPageData = async (retryCount = 0) => {
      const MAX_RETRIES = 5;
      const RETRY_DELAY = 2000;

      try {
        setLoading(true);

        console.log(`🔄 [KOLPage] Fetching all data (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

        const response = await fetch('/api/kol/page-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            kolTicker: resolvedKolName, // This is actually the ticker from URL
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
  }, [resolvedKolName, userPrivyWalletAddress]); // Use resolved kolName instead of params promise


  // Get the most recent data (prefer daily, then weekly, then monthly)
  const getCurrentData = () => {
    if (!kolData) return null;
    return kolData.daily || kolData.weekly || kolData.monthly;
  };

  const currentData = getCurrentData();

  const priceChangePositive = (currentData?.priceChange24hPercent || 0) >= 0;
  const isProfitable = currentData?.pnl?.toLowerCase().includes('+') || parseFloat(currentData?.pnl || '0') > 0;

  const handleBuyClick = () => {
    console.log("Buy button clicked - opening Meteora swap modal");
    setSwapMode('buy');
    setIsSwapModalOpen(true);
  };

  const handleSellClick = () => {
    console.log("Sell button clicked - opening Meteora swap modal in sell mode");
    setSwapMode('sell');
    setIsSwapModalOpen(true);
  };

  const handleSwapSuccess = async () => {
    console.log("✅ Swap successful - refreshing KOL page data");
    
    // Refetch the user shares after swap
    if (!resolvedKolName || !userPrivyWalletAddress) return;
    
    try {
      const response = await fetch('/api/kol/page-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kolTicker: resolvedKolName,
          userWalletAddress: userPrivyWalletAddress
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserShares(data.data.userShares);
        console.log("✅ User shares updated after swap");
      }
    } catch (err) {
      console.error("Failed to refresh shares after swap:", err);
    }
  };

  // Show loading while checking authentication or while data is loading
  if (!ready || loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto p-6 md:p-8 max-w-7xl">
          <Skeleton className="h-10 w-10 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div className="space-y-6">
              <Skeleton className="h-16 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-32" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !currentData) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error || 'No data found for this trader'}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto p-6 md:p-8 max-w-7xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          className="mb-6 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left Panel - Info & Actions */}
          <div className="space-y-6">
            {/* Name & Address */}
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                {currentData.name}
              </h1>
              <a
                href={`https://orb.helius.dev/account/${currentData.tokenMintAddress}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
              >
                <div className="w-3 h-3 rounded-full bg-primary" />
                <code className="font-mono">
                  {currentData.tokenMintAddress?.slice(0, 8)}...{currentData.tokenMintAddress?.slice(-6)}
                </code>
                <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>

            {/* Price Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Current Price</p>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-4xl md:text-5xl font-bold">
                      {currentData.tokenPrice ? `$${currentData.tokenPrice}` : '—'}
                    </span>
                    {currentData.priceChange24hPercent !== undefined && (
                      <Badge
                        variant={priceChangePositive ? "default" : "destructive"}
                        className="text-sm gap-1 px-2.5 py-1"
                      >
                        {priceChangePositive ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        {Math.abs(currentData.priceChange24hPercent || 0).toFixed(2)}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {/* {currentData.tokenPrice ? '24h change' : 'Price data unavailable'} */}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Buy/Sell Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleBuyClick}
                disabled={!currentData?.poolAddress || !currentData?.tokenMintAddress}
                size="lg"
                className="cursor-pointer px-8"
              >
                Buy
              </Button>
              <Button
                onClick={handleSellClick}
                disabled={!currentData?.poolAddress || !currentData?.tokenMintAddress}
                size="lg"
                variant="outline"
                className="cursor-pointer px-8"
              >
                Sell
              </Button>
            </div>
          </div>

          {/* Right Panel - Profile & Stats */}
          <div className="space-y-6 w-full">
            {/* Profile Card - Fixed Height */}
            <Card className="overflow-hidden h-[400px] w-full p-0" style={{ border: '4px solid #E0D29C' }}>
              <div className="relative h-full bg-gradient-to-br from-primary/10 to-accent/10">
                <Avatar className="w-full h-full rounded-none">
                  <AvatarImage
                    src={currentData.avatarUrl}
                    alt={currentData.name}
                    className="object-cover w-full h-full"
                  />
                  <AvatarFallback className="rounded-none text-6xl">
                    {currentData.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </Card>

            {/* Stats Grid - Individual Cards */}
            <div className="grid grid-cols-3 gap-2 w-full">
              {/* PnL */}
              <Card className="bg-neutral-900/80 border-neutral-800">
                <CardContent className="px-2 py-0">
                  <p className="text-xs text-muted-foreground mb-0 pl-0.5">Total PnL</p>
                  <p className={`text-2xl font-bold leading-tight pl-0.5 ${isProfitable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {currentData.pnl.toUpperCase()}
                  </p>
                </CardContent>
              </Card>

              {/* Liquidity */}
              <Card className="bg-neutral-900/80 border-neutral-800">
                <CardContent className="px-2 py-0">
                  <p className="text-xs text-muted-foreground mb-0 pl-0.5">Liquidity</p>
                  <p className="text-2xl font-bold leading-tight pl-0.5">
                    {currentData.liquidityUsd !== undefined
                      ? `$${(currentData.liquidityUsd / 1000).toFixed(2)}K`
                      : '—'}
                  </p>
                </CardContent>
              </Card>

              {/* Market Cap */}
              <Card className="bg-neutral-900/80 border-neutral-800">
                <CardContent className="px-2 py-0">
                  <p className="text-xs text-muted-foreground mb-0 pl-0.5">Market Cap</p>
                  <p className="text-2xl font-bold leading-tight pl-0.5">
                    {currentData.marketCap !== undefined
                      ? `$${(currentData.marketCap / 1000).toFixed(2)}K`
                      : '—'}
                  </p>
                </CardContent>
              </Card>

              {/* Total Supply */}
              <Card className="bg-neutral-900/80 border-neutral-800">
                <CardContent className="px-2 py-0">
                  <p className="text-xs text-muted-foreground mb-0 pl-0.5">Total Supply</p>
                  <p className="text-2xl font-bold leading-tight pl-0.5">
                    {currentData.totalSupply !== undefined
                      ? currentData.totalSupply >= 1000000000
                        ? `${(currentData.totalSupply / 1000000000).toFixed(2)}B`
                        : `${(currentData.totalSupply / 1000000).toFixed(2)}M`
                      : '—'}
                  </p>
                </CardContent>
              </Card>

              {/* Circ. Supply */}
              <Card className="bg-neutral-900/80 border-neutral-800">
                <CardContent className="px-2 py-0">
                  <p className="text-xs text-muted-foreground mb-0 pl-0.5">Circ. Supply</p>
                  <p className="text-2xl font-bold leading-tight pl-0.5">
                    {currentData.circulatingSupply !== undefined
                      ? `${(currentData.circulatingSupply / 1000000).toFixed(2)}M`
                      : '—'}
                  </p>
                </CardContent>
              </Card>

              {/* % Circ. Supply */}
              <Card className="bg-neutral-900/80 border-neutral-800">
                <CardContent className="px-2 py-0">
                  <p className="text-xs text-muted-foreground mb-0 pl-0.5">% Circ. Supply</p>
                  <p className="text-2xl font-bold leading-tight pl-0.5">
                    {currentData.totalSupply !== undefined && currentData.circulatingSupply !== undefined
                      ? `${((currentData.circulatingSupply / currentData.totalSupply) * 100).toFixed(2)}%`
                      : '—'}
                  </p>
                </CardContent>
              </Card>

              {/* Holders */}
              <Card className="bg-neutral-900/80 border-neutral-800">
                <CardContent className="px-2 py-0">
                  <p className="text-xs text-muted-foreground mb-0 pl-0.5">Holders</p>
                  <p className="text-2xl font-bold leading-tight pl-0.5">
                    {currentData.holdersCount !== undefined
                      ? currentData.holdersCount >= 1000
                        ? `${(currentData.holdersCount / 1000).toFixed(2)}k`
                        : currentData.holdersCount.toString()
                      : '—'}
                  </p>
                </CardContent>
              </Card>

              {/* Win Rate */}
              <Card className="bg-neutral-900/80 border-neutral-800">
                <CardContent className="px-2 py-0">
                  <p className="text-xs text-muted-foreground mb-0 pl-0.5">Win Rate</p>
                  <p className="text-2xl font-bold leading-tight pl-0.5">
                    {currentData.winRate !== undefined
                      ? `${currentData.winRate.toFixed(1)}%`
                      : '—'}
                  </p>
                </CardContent>
              </Card>

              {/* Shares */}
              <Card className="bg-neutral-900/80 border-neutral-800">
                <CardContent className="px-2 py-0">
                  <p className="text-xs text-muted-foreground mb-0 pl-0.5">Shares</p>
                  <p className="text-2xl font-bold leading-tight pl-0.5">
                    {userShares !== "0"
                      ? parseFloat(userShares) >= 1000
                        ? `${(parseFloat(userShares) / 1000).toFixed(2)}k`
                        : parseFloat(userShares).toFixed(2)
                      : '—'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Meteora Swap Modal */}
      {currentData?.poolAddress && currentData?.tokenMintAddress && (
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
        mode={swapMode}
      />
      )}
    </main>
  );
}
