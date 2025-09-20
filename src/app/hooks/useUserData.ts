// hooks/useUserData.ts
import { useState, useEffect, useCallback } from 'react'
import { useSolanaWallets } from '@privy-io/react-auth'

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

interface UserData {
  packs: UserPacksData | null
  tokenHoldings: TokenHolding[]
  tokenHoldingsCount: number
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

export function useUserData(authenticated: boolean) {
  const { wallets } = useSolanaWallets()
  const [userData, setUserData] = useState<UserData>({
    packs: null,
    tokenHoldings: [],
    tokenHoldingsCount: 0,
    loading: false,
    error: null,
    lastUpdated: null
  })

  const fetchUserData = useCallback(async (forceRefresh = false) => {
    if (!authenticated || !wallets.length) return

    const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy')
    if (!embeddedWallet?.address) return

    // Don't refetch if we have recent data (unless forced)
    if (!forceRefresh && userData.lastUpdated && 
        Date.now() - userData.lastUpdated.getTime() < 30000) { // 30 seconds cache
      return
    }

    setUserData(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Fetch both APIs in parallel
      const [packsResponse, holdingsResponse] = await Promise.all([
        fetch('/api/getUserPacks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userPrivyWalletAddress: embeddedWallet.address }),
        }),
        fetch('/api/getUserKOLTokenHoldings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userPrivyWalletAddress: embeddedWallet.address }),
        })
      ])

      const [packsData, holdingsData] = await Promise.all([
        packsResponse.json(),
        holdingsResponse.json()
      ])

      setUserData(prev => ({
        ...prev,
        packs: packsData.success ? packsData.data : null,
        tokenHoldings: holdingsData.success ? holdingsData.data.holdings : [],
        tokenHoldingsCount: holdingsData.success ? holdingsData.data.totalHoldings : 0,
        loading: false,
        lastUpdated: new Date()
      }))

    } catch (error) {
      console.error('Error fetching user data:', error)
      setUserData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user data'
      }))
    }
  }, [authenticated, wallets, userData.lastUpdated])

  // Initial fetch when user becomes authenticated
  useEffect(() => {
    if (authenticated && wallets.length > 0) {
      fetchUserData()
    }
  }, [authenticated, wallets.length])

  // Refresh function for manual updates (e.g., after pack reveals)
  const refreshUserData = useCallback(() => {
    fetchUserData(true)
  }, [fetchUserData])

  return {
    ...userData,
    refreshUserData
  }
}