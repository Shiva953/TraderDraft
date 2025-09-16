"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { PackRevealBanner } from "./PackRevealBanner"
import { PackDisplay, PackOpeningLoader } from "./IndividualPackScreen"
import { KOLCarousel } from "./KOLCarousel"
import { ClaimPackButton } from "./ClaimPackTokensButton"

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

const PackRevealSystem = () => {
  const [currentStep, setCurrentStep] = useState<"banner" | "pack" | "loading" | "revealed">("banner")
  const [packData, setPackData] = useState<PackRevealResponse["data"] | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleRevealClick = () => {
    setCurrentStep("pack")
  }

  const handleOpenPack = async () => {
    setCurrentStep("loading")
    setIsLoading(true)

    try {
      // Call the pack reveal API
      const response = await fetch("/api/revealPack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: "user-pack" }),
      })

      if (response.ok) {
        const result: PackRevealResponse = await response.json()
        if (result.success) {
          setPackData(result.data)
          // Wait a bit for the loading animation before showing results
          setTimeout(() => {
            setCurrentStep("revealed")
          }, 3000)
        } else {
          throw new Error("Pack reveal failed")
        }
      } else {
        throw new Error("Network error")
      }
    } catch (error) {
      console.error("Pack reveal error:", error)
      // Handle error state here
    } finally {
      setIsLoading(false)
    }
  }

  const handlePackClaim = () => {
    console.log("Pack claimed successfully!")
    // You can add additional logic here like refreshing user data
  }

  // Mock data for demo purposes
  const mockKOLs: KOLData[] = [
    {
      slot: "A",
      name: "Ansem",
      ticker: "ANSEM",
      address: "7GCi...W2hr",
      tokenMintAddress: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
      pnl: "+233 SOL",
      winRate: 78,
      avatarUrl: "/crypto-trader-avatar.png",
      xUrl: "https://twitter.com/ansem",
      rank: 1,
      tokenPrice: 0.056,
      tokensReceived: "40,000",
      estimatedValueSOL: 2.24,
      estimatedValueUSD: 224,
      transferSignature: "abc123",
    },
    {
      slot: "B",
      name: "Gainzy",
      ticker: "GAINZY",
      address: "DezX...B263",
      tokenMintAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      pnl: "+187 SOL",
      winRate: 65,
      avatarUrl: "/crypto-trader-avatar.png",
      xUrl: "https://twitter.com/gainzy",
      rank: 5,
      tokenPrice: 0.032,
      tokensReceived: "40,000",
      estimatedValueSOL: 1.28,
      estimatedValueUSD: 128,
      transferSignature: "def456",
    },
    {
      slot: "C",
      name: "Blknoiz06",
      ticker: "BLK",
      address: "EPjF...Dt1v",
      tokenMintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      pnl: "+421 SOL",
      winRate: 85,
      avatarUrl: "/crypto-trader-avatar.png",
      xUrl: "https://twitter.com/blknoiz06",
      rank: 2,
      tokenPrice: 0.098,
      tokensReceived: "40,000",
      estimatedValueSOL: 3.92,
      estimatedValueUSD: 392,
      transferSignature: "ghi789",
    },
    {
      slot: "D",
      name: "Murad",
      ticker: "MURAD",
      address: "So11...1112",
      tokenMintAddress: "So11111111111111111111111111111111111111112",
      pnl: "+892 SOL",
      winRate: 92,
      avatarUrl: "/crypto-trader-avatar.png",
      xUrl: "https://twitter.com/muradmahmudov",
      rank: 1,
      tokenPrice: 0.145,
      tokensReceived: "40,000",
      estimatedValueSOL: 5.8,
      estimatedValueUSD: 580,
      transferSignature: "jkl012",
    },
  ]

  return (
    <div className="h-screen bg-black overflow-hidden">
      <AnimatePresence mode="wait">
        {currentStep === "banner" && (
          <motion.div
            key="banner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="h-full"
          >
            <PackRevealBanner onRevealClick={handleRevealClick} />
          </motion.div>
        )}

        {currentStep === "pack" && (
          <motion.div
            key="pack"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.5 }}
            className="h-full"
          >
            <PackDisplay onOpenPack={handleOpenPack} />
          </motion.div>
        )}

        {currentStep === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="h-full"
          >
            <PackOpeningLoader />
          </motion.div>
        )}

        {currentStep === "revealed" && (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="h-full flex flex-col"
          >
            {/* KOL Carousel - takes up most of the space */}
            <div className="flex-1 min-h-0">
              <KOLCarousel kols={packData?.kols || mockKOLs} />
            </div>
            
            {/* Claim Button - fixed at bottom */}
            <div className="flex-shrink-0">
              <ClaimPackButton packId={packData?.packId || "demo-pack"} onClaim={handlePackClaim} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PackRevealSystem
