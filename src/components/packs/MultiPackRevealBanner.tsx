import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSolanaWallets } from "@privy-io/react-auth/solana"
import type { ConsolidatedKolData, MultiPackRevealResponse, UserPacksData } from "@/types"

// Pack Banner Component
export const MultiPackRevealBanner = ({ onRevealClick, packCount = 0 }: { onRevealClick: () => void; packCount?: number }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 p-8 md:p-12 text-white">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-gray-900/60 to-blue-900/20" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-6 text-center lg:text-left flex-1">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tighter">
                Multi-Pack Reveal
                <br />
                Now Live
              </h1>
              <p className="text-lg md:text-xl text-gray-200 max-w-md font-light">
                Open all your packs at once! Get consolidated KOL tokens from multiple packs in one transaction.
              </p>
              <button
                onClick={packCount > 0 ? onRevealClick : undefined}
                disabled={packCount <= 0}
                className={`flex items-center justify-center gap-3 rounded-full px-8 py-4 text-xl font-light tracking-tight text-white shadow-lg mx-auto lg:mx-0 transition-all duration-200
                  ${packCount > 0
                    ? "cursor-pointer bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:scale-105"
                    : "cursor-not-allowed bg-gradient-to-r from-gray-700 to-gray-800 opacity-60"
                  }`
                }
              >
                {packCount > 0 ? (
                  `Reveal All ${packCount} Pack${packCount === 1 ? '' : 's'}`
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Loading your packs...
                  </span>
                )}
              </button>
              {packCount > 0 && (
                <p className="text-sm text-gray-400">
                  You have {packCount} unopened pack{packCount === 1 ? '' : 's'}
                </p>
              )}
            </div>
            <div className="flex items-center justify-center gap-6 flex-shrink-0">
              <div className="relative transform rotate-12 hover:rotate-6 transition-transform duration-300">
                <img src="/pack.png" alt="Mystery Pack" className="h-40 w-auto rounded-xl shadow-2xl" />
              </div>
              <div className="relative transform -rotate-6 hover:rotate-0 transition-transform duration-300">
                <img src="/pack.png" alt="Mystery Pack" className="h-40 w-auto rounded-xl shadow-2xl" />
              </div>
              <div className="relative transform rotate-6 hover:-rotate-3 transition-transform duration-300">
                <img src="/pack.png" alt="Mystery Pack" className="h-40 w-auto rounded-xl shadow-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}