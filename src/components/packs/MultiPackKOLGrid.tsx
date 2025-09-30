import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSolanaWallets } from "@privy-io/react-auth/solana"
import { ExternalLink } from "lucide-react"
import type { ConsolidatedKolData, MultiPackRevealResponse, UserPacksData } from "@/types"

// KOL Grid Component
// Accept an optional totalPacksRevealed prop for the title
export const ConsolidatedKOLGrid = ({
  kols,
  totalPacksRevealed,
}: {
  kols: ConsolidatedKolData[]
  totalPacksRevealed?: number
}) => {
  // Compose the title
  console.log("total packs revealed", totalPacksRevealed)
  let title = ""
  if (typeof totalPacksRevealed === "number" && totalPacksRevealed > 0) {
    title = `${totalPacksRevealed}X KOL Packs > ${kols.length} Consolidated KOL${kols.length === 1 ? "" : "s"}`
  } else {
    title = `Your Consolidated KOL Collection (${kols.length})`
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      {/* <div className="mb-8">
        <h1 className="text-white text-2xl md:text-3xl font-medium">
          {title}
        </h1>
        <p className="text-gray-400 text-sm mt-2">
          Duplicate KOLs have been consolidated with combined token amounts
        </p>
      </div> */}

      {/* Scrollable Grid Container */}
      <div className="mb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600">
          {kols.map((kol, index) => (
            <motion.div
              key={kol.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="bg-gray-900 rounded-2xl overflow-hidden hover:bg-gray-800 transition-all duration-200 hover:scale-105 border border-gray-700"
            >
              {/* Avatar Image */}
              <div className="aspect-square relative">
                <img 
                  src={kol.avatarUrl || "/placeholder.svg"} 
                  alt={kol.name} 
                  className="w-full h-full object-cover" 
                />
                {/* Pack occurrence badge */}
                {kol.packOccurrences > 1 && (
                  <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {kol.packOccurrences}x
                  </div>
                )}
                {/* Rank badge */}
                <div className="absolute top-2 left-2 bg-gray-900/80 text-white text-xs font-semibold px-2 py-1 rounded">
                  #{kol.rank}
                </div>
              </div>

              {/* Info Section */}
              <div className="p-4 bg-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-black font-semibold text-lg opacity-80">{kol.ticker}</span>
                  <a
                    href={`https://orb.helius.dev/address/${kol.tokenMintAddress}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
                {/* <div className="text-gray-600 text-xs mb-2">{kol.ticker}</div> */}
                <div className="space-y-1">
                  <div className="text-black font-semibold text-sm">
                    {kol.totalTokenAmountFormatted} tokens
                  </div>
                  <div className="text-gray-600 text-xs">
                    {kol.pnl} • {kol?.winRate?.toFixed(1)}% WR
                  </div>
                </div>
                
                {/* Links */}
                <div className="flex gap-1 mt-3">
                  {kol.xUrl && (
                    <a
                      href={kol.xUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white text-xs transition-colors"
                    >
                      X
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}