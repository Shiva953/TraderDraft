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
      const response = await fetch("/api/pack/getUserPacks", {
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
      <div className="rounded-2xl bg-gray-200 p-6 font-mono">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-light text-gray-600 uppercase tracking-wide">Your Packs</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOrdersModal(true)}
              className="cursor-pointer px-4 py-2 text-sm font-light text-gray-600 hover:text-black transition-colors"
            >
              View Orders
            </button>
            <button
              onClick={fetchUserPacks}
              disabled={loading}
              className="cursor-pointer text-sm text-gray-500 hover:text-black transition-colors disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-gray-300 p-4">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-light mb-1">Total Packs</div>
            <div className="text-2xl font-light text-black">{userPacks.packHoldings}</div>
          </div>

          <div className="rounded-lg bg-gray-300 p-4">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-light mb-1">Total Value</div>
            <div className="text-2xl font-light text-black">{userPacks.totalValueOfPackHoldings} SOL</div>
          </div>

          <div className="rounded-lg bg-gray-300 p-4">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-light mb-1">Unclaimed</div>
            <div className="text-2xl font-light text-black">{userPacks.unclaimedPacks}</div>
          </div>

          <div className="rounded-lg bg-gray-300 p-4">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-light mb-1">Claimed</div>
            <div className="text-2xl font-light text-black">{userPacks.claimedPacks}</div>
          </div>
        </div>
      </div>

      <ViewOrdersModal isOpen={showOrdersModal} onClose={() => setShowOrdersModal(false)} />
    </>
  )
}
