"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState } from "react"
import { motion, useAnimate } from "framer-motion"
import { useSolanaWallets } from "@privy-io/react-auth/solana"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ExternalLink, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Import the consolidated KOL data interface
interface ConsolidatedKOLData {
  id: string
  name: string
  ticker: string
  address: string | null
  tokenMintAddress: string
  pnl: string
  winRate: number
  avatarUrl: string | null
  xUrl: string | null
  rank: number
  tokenPrice: number
  packOccurrences: number
  tokensReceived: string
  tokensReceivedFormatted: string
  totalTokenAmount: number
  totalTokenAmountFormatted: string
  estimatedValueSOL: number
  estimatedValueUSD: number
  appearsInPacks: string[]
  transferSignature?: string | null
}

interface MultiPackRevealResponseData {
  revealType: string
  revealedAt: string
  totalPacksRevealed: number
  totalUniqueKols: number
  transactionSignatures: string[]
  packCreationSignatures?: string[]
  executionMode: string
  network: string
  optimizations: string[]
  consolidatedKols: ConsolidatedKOLData[]
  stats: {
    totalPacksRevealed: number
    totalUniqueKols: number
    totalTokensReceived: number
    totalEstimatedValueSOL: number
    totalEstimatedValueUSD: number
    avgWinRate: number
    totalPnl: number
    avgRank: number
    bestRank: number
    worstRank: number
    mostFrequentKol: ConsolidatedKOLData
    duplicateRate: number
  }
}

interface TransferResult {
  kolId: string
  kolTicker: string
  kolName: string
  tokenAmount: number
  success: boolean
  signature: string | null
  error: string | null
}

export const ClaimAllTokensButton = ({
  packData,
  onClaim,
}: {
  packData: MultiPackRevealResponseData | null
  onClaim: () => void
}) => {
  const [scope, animate] = useAnimate()
  const [isLoading, setIsLoading] = useState(false)
  const [isClaimed, setIsClaimed] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [transferResults, setTransferResults] = useState<TransferResult[]>([])
  const [claimingProgress, setClaimingProgress] = useState({ current: 0, total: 0 })

  const isExecutingRef = useRef(false)

  // Get wallet from Privy
  const { wallets } = useSolanaWallets()

  const animateLoading = async () => {
    await animate(".loader", { width: "20px", scale: 1, display: "block" }, { duration: 0.2 })
  }

  const animateSuccess = async () => {
    await animate(".loader", { width: "0px", scale: 0, display: "none" }, { duration: 0.2 })
    await animate(".check", { width: "20px", scale: 1, display: "block" }, { duration: 0.2 })
    // Keep success state visible longer
    await animate(".check", { width: "0px", scale: 0, display: "none" }, { delay: 3, duration: 0.2 })
  }

  const handleClaimAll = async () => {


    // IMMEDIATELY SET THE FLAG
    if (isExecutingRef.current) {
      console.log("🚫 [ClaimAllTokensButton] Already executing, ignoring duplicate call")
      return
    }

    if (isLoading || isClaimed || !packData) {
      console.debug("[ClaimAllTokensButton] Button clicked but conditions not met")
      return
    }

    isExecutingRef.current = true
    setIsLoading(true)
    setTransferResults([])
    setClaimingProgress({ current: 0, total: packData.consolidatedKols.length })
    await animateLoading()

    try {
      if (!wallets || wallets.length === 0) {
        toast.error("No wallet found. Please connect your wallet first.")
        return
      }
  
  
      const embeddedWallet = wallets.find((w) => w.walletClientType === "privy")
      if (!embeddedWallet) {
        toast.error("No embedded wallet found.")
        return
      }
  
      if (!packData.consolidatedKols || packData.consolidatedKols.length === 0) {
        toast.error("No KOLs found to claim tokens from.")
        return
      }

      console.debug("[ClaimAllTokensButton] Starting backend-handled claim process", {
        walletAddress: embeddedWallet.address,
        totalKols: packData.consolidatedKols.length,
      })

      // Call backend API to handle all transfers directly from vault to user
      const requestBody = {
        userPrivyWalletAddress: embeddedWallet.address,
        consolidatedKols: packData.consolidatedKols,
      }

      console.debug("[ClaimAllTokensButton] Sending POST /api/pack/claimAllKOLTokens", {
        totalKols: requestBody.consolidatedKols.length,
        walletAddress: embeddedWallet.address,
      })

      // Show progress as backend processes
      setClaimingProgress({ current: 1, total: packData.consolidatedKols.length })

      const response = await fetch("/api/pack/claimAllKOLTokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()
      console.debug("[ClaimAllTokensButton] API response:", data)

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to claim tokens")
      }

      // Update progress to completion
      setClaimingProgress({ current: packData.consolidatedKols.length, total: packData.consolidatedKols.length })

      // Extract transfer results
      const results: TransferResult[] = data.data.transferResults || []
      setTransferResults(results)

      const successfulTransfers = results.filter((r) => r.success)
      const failedTransfers = results.filter((r) => !r.success)

      if (successfulTransfers.length > 0) {
        setIsClaimed(true)
        await animateSuccess()

        // Show success notification
        const message =
          failedTransfers.length > 0
            ? `${successfulTransfers.length}/${results.length} token transfers successful`
            : "All tokens claimed successfully!"

        toast.success(message + " 🎉", { duration: 8000 })

        // Show modal with transfer details
        setShowModal(true)

        // Call onClaim callback
        if (onClaim) {
        console.log("✅ [ClaimAllTokensButton] Calling success callback")
        onClaim()
      }
      } else {
        throw new Error("All token transfers failed")
      }
    } catch (error) {
      console.error("[ClaimAllTokensButton] Error claiming all tokens:", error)
      toast.error(`Error claiming tokens: ${error instanceof Error ? error.message : "Unknown error"}`)

      await animate(".loader", { width: "0px", scale: 0, display: "none" }, { duration: 0.2 })
    } finally {
      isExecutingRef.current = false
      setIsLoading(false)
    }
  }

  const totalKOLs = packData?.consolidatedKols?.length || 0
  const totalPacks = packData?.totalPacksRevealed || 0

  return (
    <>
      <div className="flex justify-center pb-8">
        <Button
          ref={scope}
          onClick={handleClaimAll}
          disabled={isLoading || isClaimed || !packData || totalPacks === 0 || isExecutingRef.current}
          size="lg"
          className="min-w-[200px] cursor-pointer rounded-full gap-2 text-md font-medium"
        >
          <Loader />
          <CheckIcon />
          <span>
            {isLoading
              ? `Claiming Tokens... (Processing ${claimingProgress.total} KOLs)`
              : isClaimed
                ? "All Tokens Claimed!"
                : `Claim All KOL Tokens`}
          </span>
        </Button>
      </div>

      <div className="mb-8 max-w-4xl mx-auto">
        <Alert className="border-green-500/30 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            <span className="font-medium">Backend-Handled Token Claims</span>
            <br />
            No wallet signatures required! Tokens are transferred directly from vault to your wallet by our backend.
          </AlertDescription>
        </Alert>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              Token Claim Results
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Packs:</span>
                    <span className="font-medium">{totalPacks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total KOLs:</span>
                    <span className="font-medium">{totalKOLs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transfers:</span>
                    <span className="font-medium">{transferResults.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Success Rate:</span>
                    <span className="font-medium text-green-600">
                      {transferResults.length > 0
                        ? `${Math.round((transferResults.filter((r) => r.success).length / transferResults.length) * 100)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Direct Vault Transfer Details</h3>
              {transferResults.map((result, index) => (
                /* Replace custom transfer result cards with shadcn Card and Badge components */
                <Card
                  key={result.kolId}
                  className={cn("border-l-4", result.success ? "border-l-green-500" : "border-l-red-500")}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="font-medium">
                            {result.kolTicker} ({result.kolName})
                          </span>
                          <Badge variant={result.success ? "default" : "destructive"}>
                            {result.success ? "Success" : "Failed"}
                          </Badge>
                        </div>

                        <div className="text-sm text-muted-foreground mb-2">
                          <span className="font-medium">Tokens transferred: </span>
                          {(result.tokenAmount / Math.pow(10, 6)).toLocaleString()} tokens
                        </div>

                        {result.success && result.signature && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Transaction:</span>
                            <code className="text-blue-600 dark:text-blue-400 font-mono text-xs break-all bg-muted px-1 py-0.5 rounded">
                              {result.signature.substring(0, 20)}...{result.signature.slice(-20)}
                            </code>
                            <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
                              <a
                                href={`https://orb.helius.dev/tx/${result.signature}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        )}

                        {!result.success && result.error && (
                          <div className="text-sm text-red-600 dark:text-red-400">
                            <span className="font-medium">Error: </span>
                            {result.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowModal(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Loader component
const Loader = () => {
  return (
    <motion.div
      initial={{
        scale: 0,
        width: 0,
        display: "none",
      }}
      style={{
        scale: 0.5,
        display: "none",
      }}
      className="loader"
    >
      <Loader2 className="h-4 w-4 animate-spin" />
    </motion.div>
  )
}

// Check icon component
const CheckIcon = () => {
  return (
    <motion.div
      initial={{
        scale: 0,
        width: 0,
        display: "none",
      }}
      style={{
        scale: 0.5,
        display: "none",
      }}
      className="check"
    >
      <CheckCircle className="h-4 w-4" />
    </motion.div>
  )
}
