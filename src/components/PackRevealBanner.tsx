"use client"
import { motion } from "framer-motion"

// Types
interface KOLData {
  slot: string
  name: string
  ticker: string
  address: string
  tokenMintAddress: string
  pnl: string
  winRate: number
  avatarUrl: string
  xUrl: string
  rank: number
  tokenPrice: number
  tokensReceived: string
  estimatedValueSOL: number
  estimatedValueUSD: number
  transferSignature: string
}

interface PackRevealResponse {
  success: boolean
  data: {
    packId: string
    revealedAt: string
    kols: KOLData[]
    stats: {
      totalKols: number
      totalTokensReceived: number
      totalEstimatedValueSOL: number
      totalEstimatedValueUSD: number
      avgWinRate: number
      totalPnl: number
    }
  }
}

// Pack Banner Component
export const PackRevealBanner = ({ onRevealClick }: { onRevealClick: () => void }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 p-8 md:p-12 text-white">
          <div className="absolute inset-0 bg-gradient-to-r from-black via-gray to-white" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-6 text-center lg:text-left flex-1">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tighter">
                Pack Reveal
                <br />
                Now Live
              </h1>
              <p className="text-[0.5xl] md:text-xl text-gray-200 max-w-md font-light">
                Open a pack to instantly reveal KOL cards. 4 KOLs per pack, claim their tokens!
              </p>
              <button
                onClick={onRevealClick}
                className="cursor-pointer flex items-center justify-center gap-3 rounded-full bg-red-400 hover:opacity-90 px-8 py-4 text-xl font-light tracking-tight text-white shadow-lg mx-auto lg:mx-0"
                // whileHover={{ scale: 1.05 }}
                // whileTap={{ scale: 0.95 }}
              >
                Reveal Your Packs
                {/* <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg> */}
              </button>
            </div>
            <div className="flex items-center justify-center gap-6 flex-shrink-0">
              <div className="relative transform rotate-12 hover:rotate-6 transition-transform duration-300">
                <img src="/pack.png" alt="Mystery Pack" className="h-40 w-auto rounded-xl shadow-2xl" />
              </div>
              <div className="relative transform -rotate-6 hover:rotate-0 transition-transform duration-300">
                <img src="/pack.png" alt="Mystery Pack" className="h-40 w-auto rounded-xl shadow-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
