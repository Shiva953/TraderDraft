import { MultiPackRevealResponse } from "./MultiPackKOLGrid";
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSolanaWallets } from "@privy-io/react-auth/solana"
import { MultiPackRevealBanner } from "./MultiPackRevealBanner"
import { MultiPackDisplay, MultiPackOpeningLoader } from "./MultiPackDisplay"
import { StatsSummary } from "./StatsSummary"
import { ConsolidatedKOLGrid } from "./MultiPackKOLGrid"
import { ClaimAllTokensButton } from "./ClaimAllKOLPacksTokens"

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
          const response = await fetch("/api/getUserPacks", {
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
        const response = await fetch("/api/revealAllPacks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numberOfPacks: packCount }),
        })
  
        if (response.ok) {
          const result: MultiPackRevealResponse = await response.json()
          if (result.success) {
            setPackData(result.data)
            
            // Reset user pack holdings to 0 after successful reveal
            await resetUserPackHoldings()
            
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
        const response = await fetch("/api/resetUserPackHoldings", {
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
  
    // Updated pack claim handler - now uses backend-handled token transfers
    const handlePackClaim = async () => {
      console.log("Token claim initiated - backend will handle transfers directly!")
      
      if (!packData || !wallets || wallets.length === 0) {
        console.error("Missing pack data or wallet for claiming")
        return
      }

      const embeddedWallet = wallets.find((w) => w.walletClientType === "privy")
      if (!embeddedWallet) {
        console.error("No embedded wallet found")
        return
      }

      // try {
      //   // Call the new backend API that handles direct vault-to-user transfers
      //   const response = await fetch("/api/claimAllKOLTokens", {
      //     method: "POST", 
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({
      //       userPrivyWalletAddress: embeddedWallet.address,
      //       consolidatedKols: packData.consolidatedKols
      //     }),
      //   })

      //   if (response.ok) {
      //     const result = await response.json()
      //     if (result.success) {
      //       console.log("✅ All tokens claimed successfully via backend:", result.data)
      //       // Update the pack data with transfer signatures if available
      //       if (result.data.consolidatedKols) {
      //         setPackData(prev => prev ? {
      //           ...prev,
      //           consolidatedKols: result.data.consolidatedKols
      //         } : null)
      //       }
      //     } else {
      //       console.error("❌ Token claim failed:", result.error)
      //     }
      //   } else {
      //     console.error("❌ Token claim request failed:", response.status)
      //   }
      // } catch (error) {
      //   console.error("❌ Error during token claim:", error)
      // }
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
                <StatsSummary stats={packData?.stats!} />
                <ConsolidatedKOLGrid kols={packData?.consolidatedKols || []} />
                {/* Updated ClaimAllTokensButton now handles backend transfers */}
                <ClaimAllTokensButton packData={packData} onClaim={handlePackClaim} />
                
                {/* Info banner about new claiming system */}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
  
  export default MultiPackRevealSystem