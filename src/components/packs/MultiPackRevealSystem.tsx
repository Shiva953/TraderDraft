import { MultiPackRevealResponse } from "@/types/pack";
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSolanaWallets } from "@privy-io/react-auth/solana"
import { MultiPackRevealBanner } from "./MultiPackRevealBanner"
import { MultiPackDisplay, MultiPackOpeningLoader } from "./MultiPackDisplay"
import { ConsolidatedKOLGrid } from "./MultiPackKOLGrid"

// Main Multi-Pack Reveal System - Updated for Backend Token Claims
export const MultiPackRevealSystem = () => {
    const [currentStep, setCurrentStep] = useState<"banner" | "pack" | "loading" | "revealed">("banner")
    const [packData, setPackData] = useState<MultiPackRevealResponse["data"] | null>(null)
    const [packCount, setPackCount] = useState(0)
    const { wallets } = useSolanaWallets()
  
    // Fetch user pack holdings when component mounts
    useEffect(() => {
      const fetchPackHoldings = async () => {
        if (!wallets || wallets.length === 0) return
  
        const embeddedWallet = wallets.find((w) => w.walletClientType === "privy")
        if (!embeddedWallet) return
  
        try {
          const response = await fetch("/api/pack/getUserPacks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userPrivyWalletAddress: embeddedWallet.address }),
          })
  
          if (response.ok) {
            const result = await response.json()
            if (result.success) {
              setPackCount(result.data.packHoldings || 0)
            }
          }
        } catch (error) {
          console.error("Error fetching pack holdings:", error)
        }
      }
  
      fetchPackHoldings()
    }, [wallets])
  
    const handleRevealClick = () => {
      setCurrentStep("pack")
    }
  
    const handleOpenPack = async () => {
      setCurrentStep("loading")

      try {
        // Get user wallet address
        if (!wallets || wallets.length === 0) {
          throw new Error("No wallet found")
        }

        const embeddedWallet = wallets.find((w) => w.walletClientType === "privy")
        if (!embeddedWallet) {
          throw new Error("No embedded wallet found")
        }

        // Step 1: Reveal all packs (now stored in database)
        const response = await fetch("/api/pack/revealAllPacks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            numberOfPacks: packCount,
            userPublicKey: embeddedWallet.address
          }),
        })

        if (response.ok) {
          const result: MultiPackRevealResponse = await response.json()
          if (result.success) {
            setPackData(result.data)

            // Reset user pack holdings to 0 after successful reveal
            await resetUserPackHoldings()

            // Step 2: Automatically claim all KOL tokens from vault
            // Call backend API to claim all tokens
            const claimResponse = await fetch("/api/pack/claimAllKOLTokens", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userPrivyWalletAddress: embeddedWallet.address,
                consolidatedKols: result.data.consolidatedKols,
              }),
            })

            const claimData = await claimResponse.json()

            if (!claimResponse.ok || !claimData.success) {
              console.error("Failed to claim tokens:", claimData.error)
              throw new Error(claimData.error || "Failed to claim tokens")
            }

            console.log("✅ Tokens claimed successfully:", claimData.data)

            // Show the revealed cards after claiming is complete
            setTimeout(() => {
              setCurrentStep("revealed")
            }, 3000)
          } else {
            throw new Error("Multi-pack reveal failed")
          }
        } else {
          throw new Error("Network error")
        }
      } catch (error) {
        console.error("Multi-pack reveal error:", error)
        // Handle error state here
      }
    }

    // Function to reset user pack holdings after reveal
    const resetUserPackHoldings = async () => {
      if (!wallets || wallets.length === 0) return

      const embeddedWallet = wallets.find((w) => w.walletClientType === "privy")
      if (!embeddedWallet) return

      try {
        const response = await fetch("/api/pack/resetUserPackHoldings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userPrivyWalletAddress: embeddedWallet.address }),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            console.log("✅ Pack holdings reset successfully:", result.data)
            // Update local pack count to 0
            setPackCount(0)
          }
        } else {
          console.error("Failed to reset pack holdings")
        }
      } catch (error) {
        console.error("Error resetting pack holdings:", error)
      }
    }

    return (
      <div className="min-h-screen bg-black overflow-hidden">
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
              <MultiPackRevealBanner onRevealClick={handleRevealClick} packCount={packCount} />
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
              <MultiPackDisplay onOpenPack={handleOpenPack} packCount={packCount} />
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
              <MultiPackOpeningLoader packCount={packCount} />
            </motion.div>
          )}
  
          {currentStep === "revealed" && (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="min-h-screen"
            >
              <div className="w-full max-w-7xl mx-auto p-6">
                {/* <StatsSummary stats={packData?.stats!} /> */}
                <ConsolidatedKOLGrid kols={packData?.consolidatedKols || []} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
  
  export default MultiPackRevealSystem