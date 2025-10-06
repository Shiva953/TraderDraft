"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowDown, Users, ExternalLink, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useSolanaWallets } from "@privy-io/react-auth";
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
  const [resolvedKolName, setResolvedKolName] = useState<string | null>(null);
  const {wallets} = useSolanaWallets()
  // DISABLE competition hook on KOL page to prevent API clash with swap requests
  const { competition, isActive } = useActiveCompetition({ enabled: false });

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const userPrivyWalletAddress = embeddedWallet?.address;

  // Resolve params once on mount (Next.js 15 async params fix)
  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setResolvedKolName(resolved.kol);
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
    if (!resolvedKolName) return; // Wait for kolName to be resolved

    const fetchAllKOLPageData = async (retryCount = 0) => {
      const MAX_RETRIES = 5;
      const RETRY_DELAY = 2000;

      try {
        setLoading(true);

        console.log(`🔄 [KOLPage] Fetching all data (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

        const response = await fetch('/api/getKOLPageData', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            kolName: resolvedKolName,
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
    setIsSwapModalOpen(true);
  };

  const handleSwapSuccess = () => {
    console.log("✅ Swap successful - user can manually refresh the page to see updated shares");
    // Don't refresh automatically to avoid request clashes
  };

  if (loading) {
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
                href={`https://solscan.io/account/${currentData.tokenMintAddress}?cluster=devnet`}
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
                      {currentData.tokenPrice || '0.000062'}
                    </span>
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
                  </div>
                  <p className="text-xs text-muted-foreground">24h change</p>
                </div>
              </CardContent>
            </Card>

            {/* Buy Button */}
            <Button
              onClick={handleBuyClick}
              disabled={!currentData?.poolAddress || !currentData?.tokenMintAddress}
              size="lg"
              className="cursor-pointer w-full md:w-auto px-8 gap-2"
            >
              <Wallet className="h-4 w-4" />
              Buy Shares
            </Button>
          </div>

          {/* Right Panel - Profile & Stats */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-square bg-gradient-to-br from-primary/10 to-accent/10">
                  <Avatar className="w-full h-full rounded-none">
                    <AvatarImage
                      src={currentData.avatarUrl}
                      alt={currentData.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-none text-6xl">
                      {currentData.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  {/* PnL Badge Overlay */}
                  <div className="absolute top-4 right-4">
                    <Card className="shadow-lg">
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground mb-1">PnL</p>
                        <p className={`text-lg font-bold ${isProfitable ? 'text-success' : 'text-destructive'}`}>
                          {currentData.pnl.toUpperCase()}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Win Rate</CardDescription>
                  <CardTitle className="text-3xl">
                    {currentData.winRate?.toFixed(1)}%
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Supply
                  </CardDescription>
                  <CardTitle className="text-lg">
                    <span className="text-3xl font-bold">599.8k</span>
                    <span className="text-sm text-muted-foreground ml-1">/1B</span>
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Your Shares Card */}
            <Card className="border-primary/20 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardDescription>Your Shares</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl">
                  <Users className="h-6 w-6 text-muted-foreground" />
                  {userShares}
                  {userShares !== "0" && (
                    <span className="text-sm font-normal text-success ml-1">tokens</span>
                  )}
                </CardTitle>
                {userShares === "0" && (
                  <CardDescription className="text-xs">No holdings found</CardDescription>
                )}
              </CardHeader>
            </Card>
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
      />
      )}
    </main>
  );
}
