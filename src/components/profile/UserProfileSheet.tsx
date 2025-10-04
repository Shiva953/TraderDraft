'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ExternalLink, Copy, LogOut, MoreVertical, RefreshCw } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import TokenHoldingsModal from './TokenHoldingsModal'
import ViewYourPacksModal from '@/components/packSale/ViewYourPacksModal'
import ViewOrdersModal from '@/components/packSale/ViewOrdersModal'
import type { UserPacksData, TokenHolding } from '@/types'

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
  onLogout
}: UserProfileSheetProps) {
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [showPacksModal, setShowPacksModal] = useState(false)
  const [showOrdersModal, setShowOrdersModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [totalTP, setTotalTP] = useState<number>(0)
  const [tpLoading, setTpLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (isOpen && userPrivyWalletAddress) {
      fetchTotalTP();
    }
  }, [isOpen, userPrivyWalletAddress]);

  const fetchTotalTP = async () => {
    setTpLoading(true);
    try {
      const response = await fetch(`/api/getUserTotalTP?userWallet=${encodeURIComponent(userPrivyWalletAddress)}`);
      if (response.ok) {
        const data = await response.json();
        setTotalTP(data.totalTP || 0);
      }
    } catch (err) {
      console.error('Error fetching total TP:', err);
    } finally {
      setTpLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
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
      <SheetContent side="right" className="w-[400px] sm:w-[500px] bg-[#0A0A0A] border-l border-neutral-800 p-0 overflow-y-auto [&>button]:hidden">
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
            <div className="flex items-center gap-4 mt-12">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 flex items-center justify-center">
                {/* Avatar placeholder */}
              </div>
            </div>

            {/* TP Display */}
            <div className="mt-6">
              {tpLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
                  <span className="text-sm text-neutral-400">Loading...</span>
                </div>
              ) : (
                <div className="font-[family-name:var(--font-geist-mono)]">
                  <span className="text-4xl text-[#FFDFCD] font-bold">{totalTP.toLocaleString()}</span>
                  <span className="text-3xl text-white ml-2">TP</span>
                </div>
              )}
            </div>

            {/* Wallet Address */}
            <div className="mt-4 flex items-center gap-2">
              <span className="font-mono text-sm text-neutral-300">{formatAddress(userPrivyWalletAddress)}</span>
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
          </div>

          {/* KOL Holdings Section */}
          <div className="px-6 py-6 border-b border-neutral-800">
            <div className="flex items-center gap-2 mb-4 text-neutral-400">
              <div className="h-5 w-5 bg-neutral-700 rounded" />
              <h3 className="text-sm font-medium">KOL Holdings</h3>
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
                    onClick={() => setShowTokenModal(true)}
                    variant="outline"
                    className="cursor-pointer w-full mt-4 bg-neutral-800/50 hover:bg-neutral-800 border-neutral-700 text-white"
                  >
                    View More
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
                    await fetchTotalTP();
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
                  <div className="text-xs text-pink-400 mb-1">Unclaimed</div>
                  <div className="text-2xl font-bold text-pink-500">{userPacks.unclaimedPacks}</div>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30 p-4">
                  <div className="text-xs text-green-400 mb-1">Claimed</div>
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
      />

      {/* View Your Packs Modal */}
      <ViewYourPacksModal
        isOpen={showPacksModal}
        onClose={() => setShowPacksModal(false)}
      />

      {/* View Orders Modal */}
      <ViewOrdersModal
        isOpen={showOrdersModal}
        onClose={() => setShowOrdersModal(false)}
      />
    </>
  )
}
