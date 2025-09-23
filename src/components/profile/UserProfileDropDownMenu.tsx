'use client'

import { useState } from 'react'
import { ExternalLink, Package, Coins, ChevronRight, Copy } from 'lucide-react'
import TokenHoldingsModal from './TokenHoldingsModal'

interface UserPacksData {
  packHoldings: number
  totalValueOfPackHoldings: number
  claimedPacks: number
  unclaimedPacks: number
}

interface TokenHolding {
  ticker: string
  name: string
  balance: string
  mintAddress: string
  poolAddress?: string
  tokenPrice?: string
  priceChange24h?: string
  priceChange24hPercent?: number
}

interface UserProfileDropDownMenuProps {
  isOpen: boolean
  onClose: () => void
  userPrivyWalletAddress: string
  userPacks: UserPacksData | null
  tokenHoldings: TokenHolding[]
  tokenHoldingsCount: number
  loading: boolean
  error: string | null
}

export default function UserProfileDropDownMenu({ 
  isOpen, 
  onClose, 
  userPrivyWalletAddress,
  userPacks,
  tokenHoldings,
  tokenHoldingsCount,
  loading,
  error
}: UserProfileDropDownMenuProps) {
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [copied, setCopied] = useState(false)

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

  if (!isOpen) return null

  return (
    <>
      <div className="absolute top-16 right-0 z-40 w-80 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
              {userPrivyWalletAddress ? userPrivyWalletAddress.substring(0, 2).toUpperCase() : '?'}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">Wallet</p>
              <div className="flex items-center gap-1">
                <span className="text-sm text-neutral-400 font-mono">{formatAddress(userPrivyWalletAddress)}</span>
                <button
                  onClick={handleCopy}
                  className="p-1 cursor-pointer rounded hover:bg-neutral-800 transition-colors duration-150"
                  title={copied ? "Copied!" : "Copy address"}
                  aria-label="Copy wallet address"
                  type="button"
                >
                  <Copy className={`h-4 w-4 text-neutral-400 ${copied ? 'text-green-400' : ''}`} />
                </button>
                {copied && (
                  <span className="ml-1 text-xs text-green-400">Copied!</span>
                )}
              </div>
            </div>
            <a
              href={solscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-neutral-800 transition-colors duration-200"
            >
              <ExternalLink className="h-4 w-4 text-neutral-400" />
            </a>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-900/20 border border-red-800 p-3 text-sm text-red-400">
              Error: {error}
            </div>
          )}

          {/* Pack Holdings */}
          <div className="rounded-lg bg-neutral-800/50 p-4">
            <div className="flex items-center gap-3 mb-3">
              <Package className="h-5 w-5 text-pink-500" />
              <h3 className="font-semibold text-white">Pack Holdings</h3>
            </div>
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
                <span className="text-sm text-neutral-400">Loading...</span>
              </div>
            ) : userPacks ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-400">Total Packs</span>
                  <span className="font-semibold text-white">{userPacks.packHoldings}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-400">Unclaimed</span>
                  <span className="font-semibold text-pink-500">{userPacks.unclaimedPacks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-400">Claimed</span>
                  <span className="font-semibold text-green-500">{userPacks.claimedPacks}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-neutral-700">
                  <span className="text-sm text-neutral-400">Market Value</span>
                  <span className="font-semibold text-white">{userPacks.totalValueOfPackHoldings} SOL</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No pack data available</p>
            )}
          </div>

          {/* Token Holdings */}
          <div className="rounded-lg bg-neutral-800/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Coins className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold text-white">KOL Token Holdings</h3>
              </div>
              {tokenHoldingsCount > 0 && (
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                  {tokenHoldingsCount}
                </span>
              )}
            </div>
            
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
                <span className="text-sm text-neutral-400">Loading...</span>
              </div>
            ) : tokenHoldingsCount > 0 ? (
              <button
                onClick={() => setShowTokenModal(true)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-neutral-700/50 hover:bg-neutral-700 transition-colors duration-200 group"
              >
                <span className="text-sm text-neutral-300 group-hover:text-white">
                  View {tokenHoldingsCount} token{tokenHoldingsCount !== 1 ? 's' : ''}
                </span>
                <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-white" />
              </button>
            ) : (
              <p className="text-sm text-neutral-400">No KOL tokens held</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800">
          <p className="text-xs text-neutral-500 text-center">
            Connected via Privy
          </p>
        </div>
      </div>

      {/* Token Holdings Modal */}
      <TokenHoldingsModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        tokenHoldings={tokenHoldings}
      />
    </>
  )
}