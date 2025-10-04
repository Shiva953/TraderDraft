import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSolanaWallets } from "@privy-io/react-auth/solana"
import { ExternalLink, TrendingUp, Trophy, Search } from "lucide-react"
import type { ConsolidatedKolData, MultiPackRevealResponse, UserPacksData } from "@/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Rarity configuration for minimal UI
const RARITY_CONFIG = {
  LEGENDARY: {
    label: 'Legendary',
    badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    icon: '👑'
  },
  EPIC: {
    label: 'Epic',
    badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    icon: '💎'
  },
  RARE: {
    label: 'Rare',
    badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    icon: '⭐'
  },
  COMMON: {
    label: 'Common',
    badgeClass: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
    icon: '◆'
  }
}

// KOL Grid Component
// Accept an optional totalPacksRevealed prop for the title
export const ConsolidatedKOLGrid = ({
  kols,
  totalPacksRevealed,
}: {
  kols: ConsolidatedKolData[]
  totalPacksRevealed?: number
}) => {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter KOLs based on search query
  const filteredKols = kols.filter((kol) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      kol.name?.toLowerCase().includes(query) ||
      kol.ticker?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Header with Title and Search */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white">KOL Cards</h2>

        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-neutral-900 text-md border-neutral-700 text-white placeholder:text-neutral-500 focus-visible:border-neutral-600"
          />
        </div>
      </div>

      {/* Grid Container */}
      <div className="mb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredKols.map((kol, index) => {
            // Determine rarity with fallback
            const rarity = kol.rarity || 'COMMON';
            const rarityConfig = RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG];

            return (
              <motion.div
                key={kol.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <Card className="group bg-neutral-900 border-white border-2 hover:border-neutral-700 overflow-hidden hover:shadow-xl hover:shadow-neutral-900/50 transition-all duration-300 cursor-pointer">
                  {/* Card Header with Avatar */}
                  <div className="px-6 my--2 relative">
                    {/* Avatar */}
                    <div className="flex items-start justify-between mb-3">
                      <Avatar className="h-16 w-16 ring-2 ring-neutral-800 group-hover:ring-neutral-700 transition-all">
                        <AvatarImage src={kol.avatarUrl || "/placeholder.svg"} alt={kol.name} />
                        <AvatarFallback className="bg-neutral-800 text-neutral-400">
                          {kol.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Rarity & Occurrences */}
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className={`text-xs ${rarityConfig.badgeClass}`}>
                          {rarityConfig.icon}
                        </Badge>
                        {kol.packOccurrences > 1 && (
                          <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/50">
                            {kol.packOccurrences}x
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* KOL Name & Ticker */}
                    <div className="mb-3">
                      <h3 className="text-white font-bold text-md truncate">
                        {kol.name}
                      </h3>
                      <div className="flex items-center gap-1 text-neutral-400 text-xs mt-1">
                        <Trophy className="h-3 w-3" />
                        <span>#{kol.rank}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-500">Tokens</span>
                        <span className="text-white font-medium">{kol.totalTokenAmountFormatted}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-500">PnL</span>
                        <span className={`font-medium ${kol.pnl.includes('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {kol.pnl}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-500">Win Rate</span>
                        <span className="text-white font-medium">{kol?.winRate?.toFixed(1)}%</span>
                      </div>
                    </div>

                    {/* Links */}
                    <div className="flex gap-2 pt-2 border-t border-neutral-800">
                      {kol.xUrl && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 h-8 text-xs hover:bg-blue-500/10 hover:text-blue-400"
                          onClick={() => window.open(kol.xUrl || 'x.com/Neutron975', '_blank')}
                        >
                          X Profile
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="cursor-pointer h-8 w-8 p-0 hover:bg-neutral-800"
                        onClick={() => window.open(`https://orb.helius.dev/address/${kol.tokenMintAddress}?cluster=devnet`, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  )
}