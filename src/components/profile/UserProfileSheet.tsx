'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ExternalLink, Copy, LogOut, MoreVertical, RefreshCw, ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import TokenHoldingsModal from './TokenHoldingsModal'
import ViewYourPacksModal from '@/components/packSale/ViewYourPacksModal'
import ViewOrdersModal from '@/components/packSale/ViewOrdersModal'
import AddFundsModal from '@/components/wallet/AddFundsModal'
import WithdrawModal from '@/components/wallet/WithdrawModal'
import type { UserPacksData, TokenHolding } from '@/types'
import { meteoraClient } from '@/lib/meteoraPriceUtils'
import { Geist_Mono } from 'next/font/google'

const geistMono = Geist_Mono({
  subsets: ["latin"],
});

interface UserProfileSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  userPrivyWalletAddress: string
  userPacks: UserPacksData | null
  tokenHoldings: TokenHolding[]
  tokenHoldingsCount: number
  loading: boolean
  error: string | null
  onLogout: () => void
  onRefreshData: () => void
  // New: keep portfolio value in sync with header display
  headerPortfolioValue?: number | null
}

export default function UserProfileSheet({
  isOpen,
  onOpenChange,
  userPrivyWalletAddress,
  userPacks,
  tokenHoldings,
  tokenHoldingsCount,
  loading,
  error,
  onLogout,
  onRefreshData,
  headerPortfolioValue
}: UserProfileSheetProps) {
  const router = useRouter()
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [showPacksModal, setShowPacksModal] = useState(false)
  const [showOrdersModal, setShowOrdersModal] = useState(false)
  const [showAddFundsModal, setShowAddFundsModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [totalTP, setTotalTP] = useState<number>(0)
  const [tpLoading, setTpLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [portfolioValue, setPortfolioValue] = useState<number>(0)
  const [portfolioValueSOL, setPortfolioValueSOL] = useState<number>(0)
  const [portfolioLoading, setPortfolioLoading] = useState(false)
  const [portfolioLastFetched, setPortfolioLastFetched] = useState<number>(0)
  const [solBalance, setSolBalance] = useState<number>(0)
  const PORTFOLIO_CACHE_DURATION = 180000 // 3 minutes cache

  // X Profile state
  const [xUsername, setXUsername] = useState<string | null>(null)
  const [xProfilePictureUrl, setXProfilePictureUrl] = useState<string | null>(null)
  const [xUrl, setXUrl] = useState<string | null>(null)
  const [xProfileLoading, setXProfileLoading] = useState(true)

  // Auto-close sheet when any modal opens
  useEffect(() => {
    if (showTokenModal || showPacksModal || showOrdersModal || showAddFundsModal || showWithdrawModal) {
      onOpenChange(false)
    }
  }, [showTokenModal, showPacksModal, showOrdersModal, showAddFundsModal, showWithdrawModal, onOpenChange])

  useEffect(() => {
    const initializePortfolio = async () => {
      if (isOpen && userPrivyWalletAddress) {
        fetchTotalTP();
        fetchXProfile();
        fetchSolBalance();
        // If header provides a value, prefer it and skip fetching here
        if (typeof headerPortfolioValue === 'number') {
          setPortfolioValue(headerPortfolioValue || 0);
          setPortfolioLastFetched(Date.now());
          // Calculate SOL value immediately
          try {
            const solPrice = await meteoraClient.getSOLPriceUSD();
            setPortfolioValueSOL((headerPortfolioValue || 0) / solPrice);
          } catch (err) {
            console.error('Error fetching SOL price:', err);
          }
          setPortfolioLoading(false);
        } else {
          fetchPortfolioValue(false); // Don't force refresh on open
        }
      }
    };
    initializePortfolio();
  }, [isOpen, userPrivyWalletAddress, headerPortfolioValue]);

  // Keep local state in sync when header value changes
  useEffect(() => {
    const updatePortfolioValues = async () => {
      if (typeof headerPortfolioValue === 'number') {
        setPortfolioValue(headerPortfolioValue || 0);
        try {
          const solPrice = await meteoraClient.getSOLPriceUSD();
          setPortfolioValueSOL((headerPortfolioValue || 0) / solPrice);
        } catch (err) {
          console.error('Error fetching SOL price:', err);
        }
      }
    };
    updatePortfolioValues();
  }, [headerPortfolioValue]);

  const fetchTotalTP = async () => {
    setTpLoading(true);
    try {
      const response = await fetch(`/api/user/getUserTotalTP?userWallet=${encodeURIComponent(userPrivyWalletAddress)}`);
      if (response.ok) {
        const data = await response.json();
        setTotalTP(Math.floor(data.totalTP || 0));
      }
    } catch (err) {
      console.error('Error fetching total TP:', err);
    } finally {
      setTpLoading(false);
    }
  };

  const fetchXProfile = async () => {
    setXProfileLoading(true);
    try {
      console.log('🔍 [UserProfileSheet] Fetching X profile for:', userPrivyWalletAddress);
      const response = await fetch(`/api/user/getXProfile?walletAddress=${encodeURIComponent(userPrivyWalletAddress)}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 [UserProfileSheet] X profile data:', data);
        if (data.ok && data.xProfile) {
          setXUsername(data.xProfile.xUsername);
          setXProfilePictureUrl(data.xProfile.xProfilePictureUrl);
          setXUrl(data.xProfile.xUrl);
          console.log('✅ [UserProfileSheet] X profile set:', {
            username: data.xProfile.xUsername,
            hasAvatar: !!data.xProfile.xProfilePictureUrl,
            hasUrl: !!data.xProfile.xUrl
          });
        } else {
          console.log('⚠️ [UserProfileSheet] No X profile found for user');
        }
      }
    } catch (err) {
      console.error('❌ [UserProfileSheet] Error fetching X profile:', err);
    } finally {
      setXProfileLoading(false);
    }
  };

  const fetchSolBalance = async () => {
    try {
      const { Connection, PublicKey, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
      const connection = new Connection(
        "https://devnet.helius-rpc.com/?api-key=017f56ed-c6c1-480a-8c11-dbc09ab2358d",
        "confirmed"
      );
      const pubkey = new PublicKey(userPrivyWalletAddress);
      const balance = await connection.getBalance(pubkey);
      setSolBalance(balance / LAMPORTS_PER_SOL);
    } catch (err) {
      console.error('Error fetching SOL balance:', err);
    }
  };

  const fetchPortfolioValue = async (forceRefresh = false) => {
    // Check cache first (unless forced refresh)
    const now = Date.now();
    const cacheAge = now - portfolioLastFetched;
    const isCacheValid = portfolioLastFetched > 0 && cacheAge < PORTFOLIO_CACHE_DURATION;

    if (!forceRefresh && isCacheValid && portfolioValue > 0) {
      const ageSeconds = Math.floor(cacheAge / 1000);
      console.log(`✅ Using cached portfolio value: $${portfolioValue.toFixed(2)} (age: ${ageSeconds}s)`);
      return;
    }

    setPortfolioLoading(true);
    try {
      console.log(`🔍 Fetching fresh portfolio value...`);
      const [portfolioResponse, solPrice] = await Promise.all([
        fetch('/api/user/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userPrivyWalletAddress })
        }),
        meteoraClient.getSOLPriceUSD()
      ]);

      if (portfolioResponse.ok) {
        const data = await portfolioResponse.json();
        if (data.success) {
          const valueUSD = data.data.totalValueUSD || 0;
          setPortfolioValue(valueUSD);
          setPortfolioValueSOL(valueUSD / solPrice);
          setPortfolioLastFetched(now);
          console.log(`✅ Portfolio value cached: $${valueUSD.toFixed(2)} (${(valueUSD / solPrice).toFixed(2)} SOL)`);
        }
      }
    } catch (err) {
      console.error('Error fetching portfolio value:', err);
    } finally {
      setPortfolioLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)} ...${address.substring(address.length - 4)}`
  }

  const solscanUrl = `https://orb.helius.dev/account/${userPrivyWalletAddress}?cluster=devnet`

  const handleCopy = async () => {
    if (!userPrivyWalletAddress) return
    try {
      await navigator.clipboard.writeText(userPrivyWalletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch (err) {
      // fallback or error handling
    }
  }

  return (
    <>
      <SheetContent side="right" className="w-[550px] sm:w-[650px] bg-[#0A0A0A] border-l border-neutral-800 p-0 overflow-y-auto [&>button]:hidden">
        <div className="flex flex-col h-full">
          {/* Header Section */}
          <div className="p-6 border-b border-neutral-800 relative">

            {/* Logout Button */}
            <Button
              onClick={onLogout}
              className="cursor-pointer absolute top-6 right-6 bg-red-900/20 hover:bg-red-900/30 text-red-500 border border-red-900/50 rounded-lg p-2"
            >
              <LogOut className="h-5 w-5" />
            </Button>

            {/* Profile Avatar */}
            <div className="flex flex-col gap-2 mt-12">
              {xProfileLoading ? (
                <>
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </>
              ) : (
                <>
                  {xProfilePictureUrl ? (
                    <div className="h-16 w-16 rounded-full overflow-hidden" style={{ border: '2px solid #EBD4AB' }}>
                      <img
                        src={xProfilePictureUrl}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 flex items-center justify-center" style={{ border: '2px solid #EBD4AB' }} />
                  )}
                  {xUsername && xUrl && (
                    <a
                      href={xUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-md mt--6 font-semibold transition-colors cursor-pointer"
                      style={{ color: '#EBD4AB' }}
                    >
                      @{xUsername.toLocaleLowerCase()}
                    </a>
                  )}
                </>
              )}
            </div>

            {/* Wallet Address */}
            <div className="mt-1 flex items-center gap-2">
              <a
                href={solscanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm transition-all cursor-pointer hover:underline"
                style={{ color: '#FFF4E0' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#D4B888'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#FFF4E0'}
              >
                {formatAddress(userPrivyWalletAddress)}
              </a>
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-neutral-800 transition-colors"
                title={copied ? "Copied!" : "Copy address"}
              >
                <Copy className={`h-4 w-4 ${copied ? 'text-green-400' : 'text-neutral-400'}`} />
              </button>
              <a
                href={solscanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-neutral-800 transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-neutral-400" />
              </a>
            </div>

            {/* Stats Grid - TP and Portfolio */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              {/* TP Card */}
              <div className="bg-[#1A1A1A] border border-neutral-800 rounded-lg p-4 min-w-0">
                {tpLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-7 w-20" />
                  </div>
                ) : (
                  <div className={geistMono.className}>
                    <div className="text-xs tracking-tight text-neutral-400 mb-2">Tournament Points</div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xl text-[#FFDFCD] font-bold">{Math.floor(totalTP).toLocaleString()}</span>
                      <span className="text-xs text-neutral-400 whitespace-nowrap">TP</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Portfolio Card */}
              <div className="rounded-lg p-4 min-w-0 border" style={{ backgroundColor: '#dbf7be', borderColor: '#c5e8a5' }}>
                {portfolioLoading && typeof headerPortfolioValue !== 'number' ? (
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" style={{ backgroundColor: '#c5e8a5' }} />
                    <Skeleton className="h-7 w-20" style={{ backgroundColor: '#b8dc92' }} />
                  </div>
                ) : (
                  <div className={geistMono.className}>
                    <div className="text-xs tracking-tight mb-2" style={{ color: '#4a5f3a' }}>Portfolio</div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xl font-bold" style={{ color: '#2d3d1f' }}>
                        {portfolioValueSOL.toFixed(2)} SOL
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Add/Withdraw Funds Buttons */}
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => setShowAddFundsModal(true)}
                className="cursor-pointer flex-1 bg-green-900/20 hover:bg-green-900/30 text-green-400 border border-green-900/50 rounded-lg py-2 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowDownRight className="h-4 w-4" />
                <span className="font-medium">Add Funds</span>
              </Button>
              <Button
                onClick={() => setShowWithdrawModal(true)}
                className="cursor-pointer flex-1 bg-orange-900/20 hover:bg-orange-900/30 text-orange-400 border border-orange-900/50 rounded-lg py-2 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowUpRight className="h-4 w-4" />
                <span className="font-medium">Withdraw</span>
              </Button>
            </div>
          </div>

          {/* KOL Holdings Section */}
          <div className="px-6 py-6 border-b border-neutral-800">
            <div className="flex items-center gap-2 mb-4 text-neutral-400">
              <h3 className="text-md text-white opacity-100 font-medium">KOL Holdings</h3>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-neutral-800 rounded-full" />
                      <div className="h-4 w-20 bg-neutral-800 rounded" />
                    </div>
                    <div className="h-4 w-16 bg-neutral-800 rounded" />
                  </div>
                ))}
              </div>
            ) : tokenHoldings.length > 0 ? (
              <>
                <div className="space-y-3 font-[family-name:var(--font-roboto-mono)]">
                  {tokenHoldings.slice(0, 3).map((holding, index) => {
                    const formatBalance = (balance: string) => {
                      try {
                        const num = BigInt(balance);
                        const divisor = BigInt(10 ** 6);
                        const wholePart = num / divisor;
                        const fractionalPart = num % divisor;

                        if (wholePart === BigInt(0) && fractionalPart > BigInt(0)) {
                          return `0.${fractionalPart.toString().padStart(6, '0').replace(/0+$/, '')}`;
                        }
                        return wholePart.toString();
                      } catch {
                        return balance;
                      }
                    };

                    return (
                      <div key={`${holding.mintAddress}-${index}`} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {holding.avatarUrl ? (
                            <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-800">
                              <Image
                                src={holding.avatarUrl}
                                alt={holding.ticker}
                                width={40}
                                height={40}
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                              {holding.ticker.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="text-white text-sm">{holding.ticker}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-white text-sm font-medium">
                            {formatBalance(holding.balance)}
                          </div>
                          <div className="text-neutral-400 text-xs">{holding.ticker}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {tokenHoldings.length > 3 && (
                  <Button
                    onClick={() => {
                      onOpenChange(false)
                      router.push('/portfolio')
                    }}
                    variant="outline"
                    className="cursor-pointer w-full mt-4 bg-neutral-800/50 hover:bg-neutral-800 border-neutral-700 text-white"
                  >
                    View Portfolio
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm text-neutral-400">No KOL tokens held</p>
            )}
          </div>

          {/* Packs Section */}
          <div className="px-6 py-6 bg-[#0A0A0A]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Packs</h3>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowOrdersModal(true)}
                  variant="outline"
                  size="sm"
                  className="cursor-pointer border-neutral-700 hover:bg-neutral-800 text-white text-xs"
                >
                  View Orders
                </Button>
                <Button
                  onClick={async () => {
                    setRefreshing(true);
                    await Promise.all([fetchTotalTP(), fetchPortfolioValue(true)]); // Force refresh
                    setTimeout(() => setRefreshing(false), 1000);
                  }}
                  disabled={refreshing}
                  variant="outline"
                  size="sm"
                  className="cursor-pointer border-neutral-700 hover:bg-neutral-800 text-white gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {loading || !userPacks ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="bg-neutral-900 p-4 border-neutral-800 animate-pulse">
                    <div className="h-4 w-20 bg-neutral-800 rounded mb-2" />
                    <div className="h-8 w-12 bg-neutral-800 rounded" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-neutral-900 border-neutral-800 p-4">
                  <div className="text-xs text-neutral-400 mb-1">Total Packs</div>
                  <div className="text-2xl font-bold text-white">{userPacks.packHoldings}</div>
                </Card>

                <Card className="bg-neutral-900 border-neutral-800 p-4">
                  <div className="text-xs text-neutral-400 mb-1">Total Value</div>
                  <div className="text-2xl font-bold text-white">
                    {Number(userPacks.totalValueOfPackHoldings).toFixed(2)}
                    <span className="text-sm text-neutral-400 ml-1">SOL</span>
                  </div>
                </Card>

                <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/30 p-4">
                  <div className="text-xs text-pink-400 mb-1">Unclaimed Packs</div>
                  <div className="text-2xl font-bold text-pink-500">{userPacks.unclaimedPacks}</div>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30 p-4">
                  <div className="text-xs text-green-400 mb-1">Packs Opened</div>
                  <div className="text-2xl font-bold text-green-500">{userPacks.claimedPacks}</div>
                </Card>
              </div>
            )}
          </div>

          {error && (
            <div className="px-6 py-3">
              <div className="rounded-lg bg-red-900/20 border border-red-800 p-3 text-sm text-red-400">
                Error: {error}
              </div>
            </div>
          )}
        </div>
      </SheetContent>

      {/* Token Holdings Modal */}
      <TokenHoldingsModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        tokenHoldings={tokenHoldings}
        loading={loading}
      />

      {/* View Your Packs Modal */}
      <ViewYourPacksModal
        isOpen={showPacksModal}
        onClose={() => setShowPacksModal(false)}
        onPacksChanged={onRefreshData}
      />

      {/* View Orders Modal */}
      <ViewOrdersModal
        isOpen={showOrdersModal}
        onClose={() => setShowOrdersModal(false)}
      />

      {/* Add Funds Modal */}
      <AddFundsModal
        isOpen={showAddFundsModal}
        onClose={() => setShowAddFundsModal(false)}
        walletAddress={userPrivyWalletAddress}
      />

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => {
          setShowWithdrawModal(false);
          fetchSolBalance(); // Refresh balance after withdrawal
        }}
        userBalance={solBalance}
      />
    </>
  )
}
