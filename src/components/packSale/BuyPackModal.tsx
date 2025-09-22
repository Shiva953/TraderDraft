/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { useSendTransaction, useSolanaWallets } from "@privy-io/react-auth/solana"
import { Connection, VersionedTransaction } from "@solana/web3.js"
import { Buffer } from "buffer"

interface BuyPackModalProps {
  isOpen: boolean
  onClose: () => void
}

const connection = new Connection("https://api.devnet.solana.com", { commitment: "confirmed" })

export default function BuyPackModal({ isOpen, onClose }: BuyPackModalProps) {
  const [packCount, setPackCount] = useState(0) // Start with 100 as shown in image
  const [isLoading, setIsLoading] = useState(false)
  const [txnHash, setTxnHash] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const { wallets } = useSolanaWallets()
  const { sendTransaction } = useSendTransaction()

  const totalPrice = packCount * 0.1
  const maxPacks = 250

  const handleBuyPacks = async () => {
    if (!wallets || wallets.length === 0) {
      alert("No wallet found. Please connect your wallet first.")
      return
    }

    const embeddedWallet = wallets.find((w) => w.walletClientType === "privy")
    if (!embeddedWallet) {
      alert("No embedded wallet found.")
      return
    }

    setIsLoading(true)
    try {
      console.log("🔵 [BuyPack] Starting transaction process")
      console.log("🔵 [BuyPack] Wallet address:", embeddedWallet.address)
      console.log(" [BuyPack] Total price:", totalPrice)
      console.log("🔍 [BuyPack] packCount:", packCount)
      console.log("🔍 [BuyPack] totalPrice:", totalPrice)
      console.log("🔍 [BuyPack] Expected: packCount * 0.1 =", packCount * 0.1)


      const response = await fetch("/api/pack/buyPack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userPrivyWalletAddress: embeddedWallet.address,
          amount: totalPrice,
        }),
      })

      const data = await response.json()
      console.log("🟢 [BuyPack] API response:", data)

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      if (data.success && data.data.buyPackTransaction) {
        console.log("🔄 [BuyPack] Deserializing transaction")

        // Deserialize the transaction from base64
        const txBuffer = Buffer.from(data.data.buyPackTransaction, "base64")
        const transaction = VersionedTransaction.deserialize(txBuffer)

        console.log("🟡 [BuyPack] Transaction deserialized, signing and sending...")

        // Sign and send the transaction using Privy
        const result = await sendTransaction({
          transaction: transaction,
          connection: connection,
          address: embeddedWallet.address,
        })

        console.log("✅ [BuyPack] Transaction sent successfully:", result)

        setTxnHash(result.signature)
        setShowSuccess(true)

        // Update user packs in database
        console.log("🔄 [BuyPack] Updating user packs in database...")
        try {
          const updateResponse = await fetch("/api/pack/updateUserPacks", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userPrivyWalletAddress: embeddedWallet.address,
              packsBought: packCount,
              totalValue: totalPrice,
              transactionHash: result.signature, // Add this line
            }),
          })

          const updateData = await updateResponse.json()
          if (updateData.success) {
            console.log("✅ [BuyPack] User packs updated successfully")
          } else {
            console.error("❌ [BuyPack] Failed to update user packs:", updateData.error)
          }
        } catch (updateError) {
          console.error("❌ [BuyPack] Error updating user packs:", updateError)
        }

        // Remove the automatic closing - let user close manually
        // setTimeout(() => {
        //   onClose()
        //   setShowSuccess(false)
        //   setTxnHash(null)
        //   setPackCount(100)
        // }, 3000)
      } else {
        throw new Error(data.error || "Failed to create transaction")
      }
    } catch (error) {
      console.error("❌ [BuyPack] Error buying packs:", error)
      alert(`Error buying packs: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      setShowSuccess(false)
      setTxnHash(null)
      setPackCount(0)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen">
      <div className="fixed inset-0 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-lg rounded-2xl bg-gray-200 p-6 shadow-2xl font-mono">
        {!showSuccess ? (
          <div className="space-y-4">
            <div className="mb-6 text-center">
              <h2 className="text-lg font-light text-gray-600 uppercase tracking-wide">
                Choose How Many Packs You Want
              </h2>
            </div>

            <div className="rounded-lg bg-gray-300 p-6">
              <div className="mb-2">
                <span className="text-sm text-gray-600 uppercase tracking-wide font-light">Quantity</span>
              </div>
              <div className="text-6xl font-light text-black mb-6">{packCount}</div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max={maxPacks}
                  step="1"
                  value={packCount}
                  onChange={(e) => setPackCount(Number(e.target.value))}
                  className="w-full h-3 bg-gray-400 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #000 0%, #000 ${(packCount / maxPacks) * 100}%, #9ca3af ${(packCount / maxPacks) * 100}%, #9ca3af 100%)`,
                  }}
                  disabled={isLoading}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>0</span>
                <span>{maxPacks}</span>
              </div>
            </div>

            <div className="rounded-lg bg-gray-300 p-6">
              <div className="mb-2">
                <span className="text-sm text-gray-600 uppercase tracking-wide font-light">You Pay</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-light text-black">{totalPrice.toFixed(2)} SOL</span>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center relative">
                  <img 
                    src="/solana.png" 
                    alt="Solana" 
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-gray-300 p-6">
              <div className="mb-2">
                <span className="text-sm text-gray-600 uppercase tracking-wide font-light">You Receive</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-light text-black">{packCount} Packs</span>
                <div className="w-8 h-8 bg-red-500 rounded-full"></div>
              </div>
            </div>

            <button
              onClick={handleBuyPacks}
              disabled={isLoading || packCount === 0}
              className="w-full rounded-full cursor-pointer px-6 py-4 text-lg font-light text-white bg-black hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white inline-block mr-2"></div>
                  Processing...
                </>
              ) : (
                `Buy ${packCount} Pack${packCount > 1 ? "s" : ""}`
              )}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-6">
              <div className="bg-black rounded-2xl p-12 mb-6">
                <h2 className="text-2xl font-light text-white uppercase tracking-wider leading-tight">
                  The Mystery
                  <br />
                  Awaits
                </h2>
              </div>

              <div className="mb-6 space-y-1">
                <p className="text-sm text-gray-600 uppercase tracking-wide font-light">
                  Your Packs Will Be Sent To You
                </p>
                <p className="text-sm text-gray-600 uppercase tracking-wide font-light">
                  And Revealed On 20th Sep 2025
                </p>
              </div>

              <div className="rounded-lg bg-gray-300 p-6">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-sm text-green-600 uppercase tracking-wide mb-1 flex items-center font-light">
                      Order Successful 
                      <svg className="ml-2 w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </p>
                    <p className="text-2xl font-light text-black uppercase">{packCount} Packs</p>
                    <p className="text-sm text-gray-500 uppercase font-light">KOL Packs</p>
                  </div>
                  <div className="w-8 h-8 bg-red-500 rounded-full"></div>
                </div>
              </div>

              {txnHash && (
                <div className="mt-4 rounded-lg bg-gray-300 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500 uppercase font-light">Transaction Hash</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(txnHash)
                        // You could add a toast notification here if you have one
                      }}
                      className="flex cursor-pointer items-center gap-1 text-xs text-gray-600 hover:text-black transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                  </div>
                  <p className="text-sm text-black font-mono break-all bg-white rounded px-3 py-2 border">
                    {txnHash}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-600 hover:text-black transition-colors disabled:opacity-50"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
