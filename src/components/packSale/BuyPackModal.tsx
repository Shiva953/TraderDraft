"use client"

import { useState } from "react"
import { usePackPurchase } from "@/app/hooks/usePackPurchase"

interface BuyPackModalProps {
  isOpen: boolean
  onClose: () => void
  onPurchaseComplete?: () => void 
}

export default function BuyPackModal({ isOpen, onClose, onPurchaseComplete }: BuyPackModalProps) {
  const [packCount, setPackCount] = useState(0)
  const { isLoading, txnHash, showSuccess, error, purchasePacks, resetState } = usePackPurchase()

  const totalPrice = packCount * 0.1
  const maxPacks = 250

  const handleBuyPacks = async () => {
    if (packCount <= 0) return
    
    const success = await purchasePacks(packCount, totalPrice)
    if (success && onPurchaseComplete) {
      onPurchaseComplete()
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      resetState()
      setPackCount(0)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen">
      <div className="fixed inset-0 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-lg rounded-2xl bg-gray-200 p-6 shadow-2xl font-mono">
        {error && !showSuccess && (
          <div className="mb-4 rounded-lg bg-red-100 border border-red-300 p-3 text-sm text-red-700">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button 
                onClick={resetState}
                className="text-red-500 hover:text-red-700 ml-2"
              >
                ×
              </button>
            </div>
          </div>
        )}

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
                `Buy ${packCount} Pack${packCount !== 1 ? "s" : ""}`
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

              <div className="mt-6">
                <button
                  onClick={handleClose}
                  className="w-full rounded-full px-6 py-4 text-lg font-light text-white bg-black hover:bg-gray-800 transition-colors"
                >
                  Done
                </button>
              </div>
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