'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { ExternalLink, Copy, TrendingUp, TrendingDown } from 'lucide-react'
import { useWallet } from '@/app/hooks/useWallet'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import type { TokenHolding } from '@/types'
import { Geist_Mono } from 'next/font/google'
import Image from 'next/image'

const geistMono = Geist_Mono({
  subsets: ["latin"],
});

interface EnrichedTokenHolding extends TokenHolding {
  valueSOL?: number;
  valueUSD?: number;
  priceChange24h?: string;
  priceChange24hPercent?: number;
}

export default function PortfolioPage() {
  const router = useRouter()
  const { authenticated, ready } = usePrivy()
  const {
    address: walletAddress,
    fullAddress: fullWalletAddress,
    isConnected
  } = useWallet()

  const [copied, setCopied] = useState(false)
  const [totalTP, setTotalTP] = useState<number>(0)
  const [tpLoading, setTpLoading] = useState(false)
  const [portfolioValueSOL, setPortfolioValueSOL] = useState<number>(0)
  const [portfolioValueUSD, setPortfolioValueUSD] = useState<number>(0)
  const [portfolioLoading, setPortfolioLoading] = useState(false)
  const [enrichedHoldings, setEnrichedHoldings] = useState<EnrichedTokenHolding[]>([])
  const [holdingsLoading, setHoldingsLoading] = useState(false)

  // X Profile state
  const [xUsername, setXUsername] = useState<string | null>(null)
  const [xProfilePictureUrl, setXProfilePictureUrl] = useState<string | null>(null)
  const [xUrl, setXUrl] = useState<string | null>(null)
  const [xProfileLoading, setXProfileLoading] = useState(true)

  // Redirect to home if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      console.log('🔒 [Portfolio] User not authenticated, redirecting to home')
      router.push('/')
    }
  }, [authenticated, ready, router])

  // Fetch X Profile
  useEffect(() => {
    const fetchXProfile = async () => {
      if (!fullWalletAddress) return

      setXProfileLoading(true)
      try {
        console.log('🔍 [Portfolio] Fetching X profile for:', fullWalletAddress)
        const response = await fetch(`/api/user/getXProfile?walletAddress=${encodeURIComponent(fullWalletAddress)}`)
        if (response.ok) {
          const data = await response.json()
          console.log('📊 [Portfolio] X profile data:', data)
          if (data.ok && data.xProfile) {
            setXUsername(data.xProfile.xUsername)
            setXProfilePictureUrl(data.xProfile.xProfilePictureUrl)
            setXUrl(data.xProfile.xUrl)
          }
        }
      } catch (err) {
        console.error('❌ [Portfolio] Error fetching X profile:', err)
      } finally {
        setXProfileLoading(false)
      }
    }

    fetchXProfile()
  }, [fullWalletAddress])

  // Fetch Total TP - WITH RETRY LOGIC
  useEffect(() => {
    const fetchTotalTP = async (retryCount = 0) => {
      const MAX_RETRIES = 5
      const RETRY_DELAY = 2000

      if (!fullWalletAddress) return

      // Keep loading state TRUE during retries
      setTpLoading(true)

      try {
        console.log(`🔄 [TP] Fetching total TP (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`)

        const response = await fetch(`/api/user/getUserTotalTP?userWallet=${encodeURIComponent(fullWalletAddress)}`)

        if (response.ok) {
          const data = await response.json()
          setTotalTP(Math.floor(data.totalTP || 0))
          console.log(`✅ [TP] Loaded TP: ${Math.floor(data.totalTP || 0)}`)

          // Success - stop loading
          setTpLoading(false)
          return
        }

        // If response not ok, retry
        throw new Error(`API returned ${response.status}`)
      } catch (err) {
        console.error(`❌ [TP] Error fetching (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, err)

        // Retry if we haven't maxed out
        if (retryCount < MAX_RETRIES) {
          console.log(`⏳ [TP] Retrying in ${RETRY_DELAY}ms...`)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
          return fetchTotalTP(retryCount + 1)
        } else {
          // Max retries reached - KEEP loading skeleton visible
          console.error(`❌ [TP] Max retries reached`)
          // Don't set loading to false - keep skeleton showing
        }
      }
    }

    fetchTotalTP()
  }, [fullWalletAddress])

  // Fetch Portfolio Holdings with enriched price data - WITH RETRY LOGIC
  useEffect(() => {
    const fetchPortfolioData = async (retryCount = 0) => {
      const MAX_RETRIES = 5
      const RETRY_DELAY = 2000

      if (!fullWalletAddress) return

      // Keep loading state TRUE during retries
      setPortfolioLoading(true)
      setHoldingsLoading(true)

      try {
        console.log(`🔄 [Portfolio] Fetching holdings (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`)

        // Fetch enriched holdings from API endpoint
        const response = await fetch('/api/user/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userPrivyWalletAddress: fullWalletAddress })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setEnrichedHoldings(data.data.holdings)
            setPortfolioValueUSD(data.data.totalValueUSD)
            setPortfolioValueSOL(data.data.totalValueSOL)
            console.log(`✅ [Portfolio] Loaded ${data.data.totalHoldings} holdings with total value: $${data.data.totalValueUSD.toFixed(2)}`)

            // Success - stop loading
            setPortfolioLoading(false)
            setHoldingsLoading(false)
            return
          }
        }

        // If response not ok or data not success, retry
        throw new Error(`API returned ${response.status}`)
      } catch (err) {
        console.error(`❌ [Portfolio] Error fetching data (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, err)

        // Retry if we haven't maxed out
        if (retryCount < MAX_RETRIES) {
          console.log(`⏳ [Portfolio] Retrying in ${RETRY_DELAY}ms...`)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
          return fetchPortfolioData(retryCount + 1)
        } else {
          // Max retries reached - KEEP loading skeleton visible
          console.error(`❌ [Portfolio] Max retries reached`)
          // Don't set loading to false - keep skeleton showing
        }
      }
    }

    fetchPortfolioData()
  }, [fullWalletAddress])

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  const solscanUrl = fullWalletAddress
    ? `https://orb.helius.dev/account/${fullWalletAddress}?cluster=devnet`
    : '#'

  const handleCopy = async () => {
    if (!fullWalletAddress) return
    try {
      await navigator.clipboard.writeText(fullWalletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatBalance = (balance: string) => {
    try {
      const num = BigInt(balance)
      const divisor = BigInt(10 ** 6)
      const wholePart = num / divisor
      const fractionalPart = num % divisor

      if (wholePart === BigInt(0) && fractionalPart > BigInt(0)) {
        return `0.${fractionalPart.toString().padStart(6, '0').replace(/0+$/, '')}`
      }
      // Add comma separators for better UX
      return parseInt(wholePart.toString()).toLocaleString()
    } catch {
      return balance
    }
  }

  const handleNavigateToKOL = (ticker: string) => {
    router.push(`/kols/${ticker.toLowerCase()}`)
  }

  if (!ready || holdingsLoading) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="container mx-auto max-w-7xl">
          <Skeleton className="h-20 w-full mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="container mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-8">
          {/* Left: User Profile */}
          <div className="flex flex-col gap-4">
            {xProfileLoading ? (
              <>
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="h-6 w-48" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  {xProfilePictureUrl ? (
                    <div className="h-20 w-20 rounded-full overflow-hidden border-2" style={{ borderColor: '#EBD4AB' }}>
                      <img
                        src={xProfilePictureUrl}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 flex items-center justify-center border-2" style={{ borderColor: '#EBD4AB' }} />
                  )}

                  <div className="flex flex-col">
                    {xUsername && xUrl && (
                      <a
                        href={xUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold transition-colors cursor-pointer flex items-center gap-2"
                        style={{ color: '#EBD4AB', fontSize: 'calc(2rem / 1.1 / 1.25)' }}
                      >
                        @{xUsername.toLowerCase()}
                        <Image
                          src="/x.png"
                          alt="X"
                          width={16}
                          height={16}
                          className="opacity-100 hover:opacity-100 transition-opacity"
                          style={{ backgroundColor: 'transparent' }}
                        />
                      </a>
                    )}

                    {/* Wallet Address */}
                    <div className="mt-1 flex items-center gap-2">
                      <a
                        href={solscanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${geistMono.className} text-sm transition-all cursor-pointer hover:underline`}
                        style={{ color: '#FFF4E0' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#D4B888'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#FFF4E0'}
                      >
                        {fullWalletAddress && formatAddress(fullWalletAddress)}
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

                    {/* 24hr Portfolio Change - Below wallet address */}
                    <div className="mt-0.5">
                      {portfolioLoading ? (
                        <Skeleton className="h-5 w-24" />
                      ) : (
                        <span
                          className={`${geistMono.className} font-bold tracking-tight`}
                          style={{
                            color: '#97fc4e',
                            textShadow: '0 0 8px rgba(151, 252, 78, 0.5)',
                            fontSize: '1.25rem'
                          }}
                        >
                          +0.00%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right: Portfolio Value & TP Cards */}
          <div className="flex gap-4">
            {/* Portfolio Card */}
            <Card className="rounded-lg p-6 min-w-[200px] border" style={{ backgroundColor: '#dbf7be', borderColor: '#c5e8a5' }}>
              {portfolioLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" style={{ backgroundColor: '#c5e8a5' }} />
                  <Skeleton className="h-8 w-28" style={{ backgroundColor: '#b8dc92' }} />
                </div>
              ) : (
                <div className={geistMono.className}>
                  <div className="text-sm tracking-tight mb-2" style={{ color: '#4a5f3a' }}>Portfolio</div>
                  <div className="flex flex-col gap-1">
                    <span className="text-2xl font-bold" style={{ color: '#2d3d1f' }}>
                      {portfolioValueSOL.toFixed(2)} SOL
                    </span>
                    <span className="text-sm" style={{ color: '#4a5f3a' }}>
                      ${portfolioValueUSD.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* TP Card */}
            <Card className="bg-[#1A1A1A] border border-neutral-800 rounded-lg p-6 min-w-[200px]">
              {tpLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ) : (
                <div className={geistMono.className}>
                  <div className="text-sm tracking-tight text-neutral-400 mb-2">Tournament Points</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl text-[#FFDFCD] font-bold">{Math.floor(totalTP).toLocaleString()}</span>
                    <span className="text-sm text-neutral-400">TP</span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* KOL Holdings Table */}
        <div>
          <h2 className="text-2xl font-bold mb-4">KOL Holdings</h2>

          {holdingsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : enrichedHoldings.length > 0 ? (
            <div className="bg-[#1A1A1A] border border-neutral-800 rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-7 gap-4 p-4 border-b border-neutral-800 font-medium text-neutral-400" style={{ fontSize: 'calc(0.875rem / 1.25 * 1.125 * 1.075)' }}>
                <div className="col-span-2">KOL</div>
                <div className="text-right">Balance</div>
                <div className="text-right">Value (SOL)</div>
                <div className="text-right">24h Change</div>
                <div className="col-span-2 text-center">Actions</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-neutral-800">
                {enrichedHoldings.map((holding, index) => {
                  const priceChangePositive = (holding.priceChange24hPercent || 0) >= 0

                  return (
                    <div key={`${holding.mintAddress}-${index}`} className="grid grid-cols-7 gap-4 p-4 items-center hover:bg-neutral-800/50 transition-colors cursor-pointer" style={{ fontSize: 'calc(0.875rem / 1.25 * 1.125 * 1.075)' }}>
                      {/* KOL Info */}
                      <div className="col-span-2 flex items-center gap-3">
                        {holding.avatarUrl ? (
                          <div className="h-12 w-12 rounded-full overflow-hidden bg-neutral-800">
                            <Image
                              src={holding.avatarUrl}
                              alt={holding.ticker}
                              width={48}
                              height={48}
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold" style={{ fontSize: 'calc(0.75rem / 1.25 * 1.125 * 1.075)' }}>
                            {holding.ticker.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-white font-medium">{holding.ticker}</div>
                          <div className="text-neutral-400" style={{ fontSize: 'calc(0.75rem / 1.25 * 1.125 * 1.075)' }}>{holding.name}</div>
                        </div>
                      </div>

                      {/* Balance */}
                      <div className="text-right">
                        <div className="text-white font-medium">{formatBalance(holding.balance)}</div>
                      </div>

                      {/* Value SOL */}
                      <div className="text-right text-white font-medium">
                        {holding.valueSOL ? `${holding.valueSOL.toFixed(4)} SOL` : '—'}
                      </div>

                      {/* 24h Change */}
                      <div className="text-right">
                        {holding.priceChange24hPercent !== undefined ? (
                          <Badge
                            variant={priceChangePositive ? "default" : "destructive"}
                            className="gap-1"
                            style={{ fontSize: 'calc(0.75rem / 1.25 * 1.125 * 1.075)' }}
                          >
                            {priceChangePositive ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {Math.abs(holding.priceChange24hPercent).toFixed(2)}%
                          </Badge>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex gap-2 justify-center">
                        <Button
                          onClick={() => handleNavigateToKOL(holding.ticker)}
                          size="sm"
                          className="cursor-pointer"
                        >
                          Buy
                        </Button>
                        <Button
                          onClick={() => handleNavigateToKOL(holding.ticker)}
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                        >
                          Sell
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <Card className="bg-[#1A1A1A] border border-neutral-800 p-8">
              <p className="text-center text-neutral-400">No KOL tokens held</p>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}
