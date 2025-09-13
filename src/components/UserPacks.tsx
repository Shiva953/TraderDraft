"use client"

import { useState, useEffect } from "react"
import { useSolanaWallets } from "@privy-io/react-auth"
import ViewOrdersModal from "./ViewOrdersModal"

interface UserPacksData {
  packHoldings: number
  totalValueOfPackHoldings: number
  claimedPacks: number
  unclaimedPacks: number
}

export default function UserPacks() {
  const [userPacks, setUserPacks] = useState<UserPacksData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showOrdersModal, setShowOrdersModal] = useState(false)
  const { wallets } = useSolanaWallets()

  const fetchUserPacks = async () => {
    if (!wallets || wallets.length === 0) return

    const embeddedWallet = wallets.find((w) => w.walletClientType === "privy")
    if (!embeddedWallet) return

    setLoading(true)
    try {
      const response = await fetch("/api/getUserPacks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userPrivyWalletAddress: embeddedWallet.address,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setUserPacks(data.data)
      }
    } catch (error) {
      console.error("Error fetching user packs:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserPacks()
  }, [wallets])

  if (!userPacks) return null

  return (
    <>
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Your Packs</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOrdersModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
            >
              View Orders
            </button>
            <button
              onClick={fetchUserPacks}
              disabled={loading}
              className="text-sm text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-neutral-700 p-4 bg-neutral-800/50">
            <div className="text-sm text-neutral-400 mb-1">Total Packs</div>
            <div className="text-2xl font-bold text-white">{userPacks.packHoldings}</div>
          </div>

          <div className="rounded-lg border border-neutral-700 p-4 bg-neutral-800/50">
            <div className="text-sm text-neutral-400 mb-1">Total Value</div>
            <div className="text-2xl font-bold text-purple-400">{userPacks.totalValueOfPackHoldings} SOL</div>
          </div>

          <div className="rounded-lg border border-neutral-700 p-4 bg-neutral-800/50">
            <div className="text-sm text-neutral-400 mb-1">Unclaimed</div>
            <div className="text-2xl font-bold text-orange-400">{userPacks.unclaimedPacks}</div>
          </div>

          <div className="rounded-lg border border-neutral-700 p-4 bg-neutral-800/50">
            <div className="text-sm text-neutral-400 mb-1">Claimed</div>
            <div className="text-2xl font-bold text-green-400">{userPacks.claimedPacks}</div>
          </div>
        </div>
      </div>

      <ViewOrdersModal isOpen={showOrdersModal} onClose={() => setShowOrdersModal(false)} />
    </>
  )
}
