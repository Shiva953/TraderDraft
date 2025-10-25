// hooks/useUserData.ts
import { useState, useEffect, useCallback } from 'react'
import { useSolanaWallets } from '@privy-io/react-auth'
import type { UserPacksData, TokenHolding, UserData } from '@/types'

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

  // Fetch with retry logic (for after token claims when holdings may take time to appear)
  const fetchUserDataWithRetry = useCallback(async (
    retryCount = 0,
    maxRetries = 10, // Will retry up to 10 times
    retryDelay = 2000 // Start with 2 seconds between retries
  ): Promise<boolean> => {
    if (!authenticated || !wallets.length) return false

    const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy')
    if (!embeddedWallet?.address) return false

    console.log(`🔄 [USER_DATA] Fetching holdings (attempt ${retryCount + 1}/${maxRetries + 1})...`)

    try {
      const [packsResponse, holdingsResponse] = await Promise.all([
        fetch('/api/pack/getUserPacks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userPrivyWalletAddress: embeddedWallet.address }),
        }),
        fetch('/api/kol/user-holdings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userPrivyWalletAddress: embeddedWallet.address }),
        })
      ])

      const [packsData, holdingsData] = await Promise.all([
        packsResponse.json(),
        holdingsResponse.json()
      ])

      const holdingsCount = holdingsData.success ? holdingsData.data.totalHoldings : 0
      
      // Update state with current data
      setUserData(prev => ({
        ...prev,
        packs: packsData.success ? packsData.data : null,
        tokenHoldings: holdingsData.success ? holdingsData.data.holdings : [],
        tokenHoldingsCount: holdingsCount,
        loading: holdingsCount === 0 && retryCount < maxRetries, // Keep loading if no holdings and will retry
        lastUpdated: new Date()
      }))

      // If we found holdings, success!
      if (holdingsCount > 0) {
        console.log(`✅ [USER_DATA] Found ${holdingsCount} holdings!`)
        return true
      }

      // No holdings yet - retry if we haven't maxed out
      if (retryCount < maxRetries) {
        console.log(`⏳ [USER_DATA] No holdings found, retrying in ${retryDelay}ms...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        // Exponential backoff: increase delay by 1.5x each time (max 10 seconds)
        const nextDelay = Math.min(retryDelay * 1.5, 10000)
        return fetchUserDataWithRetry(retryCount + 1, maxRetries, nextDelay)
      }

      // Max retries reached with no holdings
      console.warn(`⚠️  [USER_DATA] Max retries reached, no holdings found`)
      setUserData(prev => ({ ...prev, loading: false }))
      return false

    } catch (error) {
      console.error(`❌ [USER_DATA] Error on attempt ${retryCount + 1}:`, error)
      
      // Retry on error too
      if (retryCount < maxRetries) {
        console.log(`⏳ [USER_DATA] Retrying after error in ${retryDelay}ms...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        const nextDelay = Math.min(retryDelay * 1.5, 10000)
        return fetchUserDataWithRetry(retryCount + 1, maxRetries, nextDelay)
      }

      setUserData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user data'
      }))
      return false
    }
  }, [authenticated, wallets])

  const fetchUserData = useCallback(async (forceRefresh = false, retryCount = 0, maxRetries = 5) => {
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
        fetch('/api/pack/getUserPacks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userPrivyWalletAddress: embeddedWallet.address }),
        }),
        fetch('/api/kol/user-holdings', {
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
      console.error(`Error fetching user data (attempt ${retryCount + 1}/${maxRetries + 1}):`, error)

      // Retry on error - keep loading state true
      if (retryCount < maxRetries) {
        const retryDelay = Math.min(2000 * (retryCount + 1), 10000) // 2s, 4s, 6s, 8s, 10s
        console.log(`⏳ [USER_DATA] Retrying in ${retryDelay}ms...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return fetchUserData(true, retryCount + 1, maxRetries)
      }

      // Max retries reached - still keep loading to show skeleton
      setUserData(prev => ({
        ...prev,
        loading: true, // Keep showing loading skeleton instead of "No KOL tokens held"
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
  // Use withRetry=true after token claims to keep retrying until holdings appear
  const refreshUserData = useCallback((withRetry = false) => {
    if (withRetry) {
      console.log('🔄 [USER_DATA] Refreshing with retry logic (will wait for holdings)...')
      setUserData(prev => ({ ...prev, loading: true }))
      return fetchUserDataWithRetry()
    } else {
      return fetchUserData(true)
    }
  }, [fetchUserData, fetchUserDataWithRetry])

  return {
    ...userData,
    refreshUserData
  }
}