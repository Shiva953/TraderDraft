/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from "react"
import { motion, useAnimate } from "framer-motion"
import { useSendTransaction, useSolanaWallets } from "@privy-io/react-auth/solana"
import { Connection, VersionedTransaction } from "@solana/web3.js"
import { Buffer } from "buffer"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const connection = new Connection("https://api.devnet.solana.com", { commitment: "confirmed" })

export const ClaimPackButton = ({
  packId,
  onClaim,
  amountPerKol = 40000,
}: {
  packId: string
  onClaim: () => void
  amountPerKol?: number
}) => {
  const [scope, animate] = useAnimate()
  const [isLoading, setIsLoading] = useState(false)
  const [isClaimed, setIsClaimed] = useState(false)
  const { wallets } = useSolanaWallets()
  const { sendTransaction } = useSendTransaction()

  // Debug: Log component mount/unmount
  useEffect(() => {
    console.debug("[ClaimPackButton] Mounted with packId:", packId, "amountPerKol:", amountPerKol)
    return () => {
      console.debug("[ClaimPackButton] Unmounted")
    }
  }, [packId, amountPerKol])

  const animateLoading = async () => {
    console.debug("[ClaimPackButton] animateLoading called")
    await animate(".loader", { width: "20px", scale: 1, display: "block" }, { duration: 0.2 })
  }

  const animateSuccess = async () => {
    console.debug("[ClaimPackButton] animateSuccess called")
    await animate(".loader", { width: "0px", scale: 0, display: "none" }, { duration: 0.2 })
    await animate(".check", { width: "20px", scale: 1, display: "block" }, { duration: 0.2 })
    // Keep the success state visible longer for claiming
    await animate(".check", { width: "0px", scale: 0, display: "none" }, { delay: 3, duration: 0.2 })
  }

  const handleClaimClick = async () => {
    if (isLoading || isClaimed) {
      console.debug("[ClaimPackButton] Claim button clicked but already loading or claimed")
      return
    }

    if (!wallets || wallets.length === 0) {
      console.warn("[ClaimPackButton] No wallet found. Please connect your wallet first.")
      toast.error("No wallet found. Please connect your wallet first.")
      return
    }

    const embeddedWallet = wallets.find((w) => w.walletClientType === "privy")
    if (!embeddedWallet) {
      console.warn("[ClaimPackButton] No embedded wallet found.")
      toast.error("No embedded wallet found.")
      return
    }

    setIsLoading(true)
    await animateLoading()

    try {
      console.debug("[ClaimPackButton] Starting claim transaction process", {
        walletAddress: embeddedWallet.address,
        packId,
        amountPerKol,
      })

      // Call the API to create the claim transaction
      const requestBody = {
        userPrivyWalletAddress: embeddedWallet.address,
        packId: packId,
        amountPerKol: amountPerKol,
      }
      console.debug("[ClaimPackButton] Sending POST /api/pack/claimPack with body:", requestBody)

      const response = await fetch("/api/pack/claimPack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()
      console.debug("[ClaimPackButton] /api/pack/claimPack response:", data)

      if (!response.ok) {
        console.error("[ClaimPackButton] /api/pack/claimPack error:", data.error || `HTTP error! status: ${response.status}`)
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      if (data.success && data.data.claimPackTransaction) {
        console.debug("[ClaimPackButton] Deserializing transaction from base64")

        // Deserialize the transaction from base64
        const txBuffer = Buffer.from(data.data.claimPackTransaction, "base64")
        const transaction = VersionedTransaction.deserialize(txBuffer)

        console.debug("[ClaimPackButton] Transaction deserialized, signing and sending...")

        // Sign and send the transaction using Privy
        const result = await sendTransaction({
          transaction: transaction,
          connection: connection,
          address: embeddedWallet.address,
        })

        console.debug("[ClaimPackButton] Transaction sent successfully:", result)

        setIsClaimed(true)
        await animateSuccess()

        // Show success toast with explorer link
        toast.success(
          <div className="flex flex-col gap-2">
            <span className="font-semibold">Tokens claimed successfully! 🎉</span>
            <a 
              href={`https://orb.helius.dev/tx/${result.signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline text-sm break-all"
            >
              View on Explorer →
            </a>
          </div>,
          {
            duration: 8000, // Show for 8 seconds
          }
        )

        // Call the onClaim callback
        console.debug("[ClaimPackButton] Calling onClaim callback")
        onClaim()
      } else {
        console.error("[ClaimPackButton] Failed to create claim transaction:", data.error)
        throw new Error(data.error || "Failed to create claim transaction")
      }
    } catch (error) {
      console.error("[ClaimPackButton] Error claiming pack:", error)
      toast.error(`Error claiming pack: ${error instanceof Error ? error.message : "Unknown error"}`)

      // Reset loading state on error
      await animate(".loader", { width: "0px", scale: 0, display: "none" }, { duration: 0.2 })
    } finally {
      setIsLoading(false)
      console.debug("[ClaimPackButton] handleClaimClick finished, isLoading set to false")
    }
  }

  return (
    <div className="w-full flex justify-center items-center py-4 px-4 bg-black">
      <div className="text-center max-w-md w-full">
        <button
          ref={scope}
          onClick={handleClaimClick}
          disabled={isLoading || isClaimed}
          className={cn(
            "flex min-w-[120px] cursor-pointer items-center justify-center gap-2 rounded-full bg-green-500 px-4 py-2 font-medium text-white ring-offset-2 transition duration-200 hover:ring-2 hover:ring-green-500 dark:ring-offset-black w-full max-w-[280px] mx-auto",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          <div className="flex items-center gap-2">
            <Loader />
            <CheckIcon />
            <span>
              {isLoading ? "Claiming Tokens..." : isClaimed ? "Tokens Claimed!" : "Claim Pack Tokens"}
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}

// Added separate Loader component matching original structure
const Loader = () => {
  return (
    <motion.svg
      animate={{
        rotate: [0, 360],
      }}
      initial={{
        scale: 0,
        width: 0,
        display: "none",
      }}
      style={{
        scale: 0.5,
        display: "none",
      }}
      transition={{
        duration: 0.3,
        repeat: Number.POSITIVE_INFINITY,
        ease: "linear",
      }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="loader text-white"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 3a9 9 0 1 0 9 9" />
    </motion.svg>
  )
}

// Added separate CheckIcon component matching original structure
const CheckIcon = () => {
  return (
    <motion.svg
      initial={{
        scale: 0,
        width: 0,
        display: "none",
      }}
      style={{
        scale: 0.5,
        display: "none",
      }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="check text-white"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M9 12l2 2l4 -4" />
    </motion.svg>
  )
}