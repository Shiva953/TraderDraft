import { useState } from "react"
import { motion, useAnimate, AnimatePresence } from "framer-motion"
import { useSendTransaction, useSolanaWallets } from "@privy-io/react-auth/solana"
import { Connection, VersionedTransaction } from "@solana/web3.js"
import { Buffer } from "buffer"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { X, ExternalLink, CheckCircle, AlertCircle } from "lucide-react"

const connection = new Connection("http://api.devnet.solana.com", { commitment: "confirmed" })

// Import the original interface from your MultiPackKOLGrid file
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
  transferSignature: string | null
}

interface MultiPackRevealResponseData {
  revealType: string
  revealedAt: string
  totalPacksRevealed: number
  totalUniqueKols: number
  transactionSignatures: string[]
  packCreationSignatures: string[]
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

interface TransactionResult {
  signature: string
  packsInTransaction: string[]
  success: boolean
  error?: string
}

export const ClaimAllTokensButton = ({ 
  packData, 
  onClaim 
}: { 
  packData: MultiPackRevealResponseData | null
  onClaim: () => void 
}) => {
  const [scope, animate] = useAnimate()
  const [isLoading, setIsLoading] = useState(false)
  const [isClaimed, setIsClaimed] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [transactionResults, setTransactionResults] = useState<TransactionResult[]>([])
  const [claimingProgress, setClaimingProgress] = useState({ current: 0, total: 0 })
  
  const { wallets } = useSolanaWallets()
  const { sendTransaction } = useSendTransaction()

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
    if (isLoading || isClaimed || !packData) {
      console.debug("[ClaimAllTokensButton] Button clicked but conditions not met")
      return
    }

    if (!wallets || wallets.length === 0) {
      toast.error("No wallet found. Please connect your wallet first.")
      return
    }

    const embeddedWallet = wallets.find((w) => w.walletClientType === "privy")
    if (!embeddedWallet) {
      toast.error("No embedded wallet found.")
      return
    }

    const packIds = packData?.consolidatedKols ? 
      Array.from(new Set(packData.consolidatedKols.flatMap(kol => kol.appearsInPacks))) : []
    
    if (packIds.length === 0) {
      toast.error("No packs found to claim tokens from.")
      return
    }

    setIsLoading(true)
    setTransactionResults([])
    setClaimingProgress({ current: 0, total: 0 })
    await animateLoading()

    try {
      console.debug("[ClaimAllTokensButton] Starting claim all process", {
        walletAddress: embeddedWallet.address,
        packIds,
        totalPacks: packIds.length
      })

      // Call API to create claim transactions
      const requestBody = {
        userPrivyWalletAddress: embeddedWallet.address,
        packIds: packIds,
        amountPerKol: 40000, // Default amount per KOL
      }

      console.debug("[ClaimAllTokensButton] Sending POST /api/claimAllKOLTokens", requestBody)

      const response = await fetch("/api/claimAllKOLTokens", {
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

      if (!data.success || !data.data.transactions) {
        throw new Error(data.error || "Failed to create claim transactions")
      }

      const { transactions, packsPerTransaction } = data.data
      setClaimingProgress({ current: 0, total: transactions.length })

      console.debug("[ClaimAllTokensButton] Processing", transactions.length, "transactions")

      const results: TransactionResult[] = []
      let packIndex = 0

      // Process each transaction sequentially to avoid RPC rate limits
      for (let i = 0; i < transactions.length; i++) {
        try {
          setClaimingProgress({ current: i, total: transactions.length })

          const txBuffer = Buffer.from(transactions[i], "base64")
          const transaction = VersionedTransaction.deserialize(txBuffer)

          console.debug(`[ClaimAllTokensButton] Sending transaction ${i + 1}/${transactions.length}`)

          const result = await sendTransaction({
            transaction: transaction,
            connection: connection,
            address: embeddedWallet.address,
          })

          const packsInThisTx = packIds.slice(packIndex, packIndex + packsPerTransaction[i])
          packIndex += packsPerTransaction[i]

          results.push({
            signature: result.signature,
            packsInTransaction: packsInThisTx,
            success: true
          })

          console.debug(`[ClaimAllTokensButton] Transaction ${i + 1} successful:`, result.signature)

          // Small delay between transactions
          if (i < transactions.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }

        } catch (error) {
          console.error(`[ClaimAllTokensButton] Transaction ${i + 1} failed:`, error)
          
          const packsInThisTx = packIds.slice(packIndex, packIndex + (packsPerTransaction[i] || 1))
          packIndex += packsPerTransaction[i] || 1

          results.push({
            signature: '',
            packsInTransaction: packsInThisTx,
            success: false,
            error: error instanceof Error ? error.message : "Transaction failed"
          })
        }
      }

      setTransactionResults(results)
      setClaimingProgress({ current: transactions.length, total: transactions.length })

      const successfulTransactions = results.filter(r => r.success)
      const failedTransactions = results.filter(r => !r.success)

      if (successfulTransactions.length > 0) {
        setIsClaimed(true)
        await animateSuccess()
        
        // Show success notification
        const message = failedTransactions.length > 0 
          ? `${successfulTransactions.length}/${results.length} transactions successful`
          : "All tokens claimed successfully!"
        
        toast.success(message + " 🎉", { duration: 8000 })
        
        // Show modal with transaction details
        setShowModal(true)
        
        // Call onClaim callback
        onClaim()
      } else {
        throw new Error("All transactions failed")
      }

    } catch (error) {
      console.error("[ClaimAllTokensButton] Error claiming all tokens:", error)
      toast.error(`Error claiming tokens: ${error instanceof Error ? error.message : "Unknown error"}`)
      
      await animate(".loader", { width: "0px", scale: 0, display: "none" }, { duration: 0.2 })
    } finally {
      setIsLoading(false)
    }
  }

  const totalKOLs = packData?.consolidatedKols?.length || 0
  const totalPacks = packData?.totalPacksRevealed || 0

  return (
    <>
      <div className="flex justify-center pb-8">
        <button
          ref={scope}
          onClick={handleClaimAll}
          disabled={isLoading || isClaimed || !packData || totalPacks === 0}
          className={cn(
            "flex min-w-[200px] cursor-pointer items-center justify-center gap-2 rounded-full bg-[#1E7FFF] px-8 py-4 text-lg font-medium text-white shadow-lg transition-all duration-200 hover:bg-[#1565C0] hover:scale-105",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          )}
        >
          <div className="flex items-center gap-2">
            <Loader />
            <CheckIcon />
            <span>
              {isLoading 
                ? `Claiming Tokens... (${claimingProgress.current}/${claimingProgress.total})`
                : isClaimed 
                  ? "All Tokens Claimed!" 
                  : `Claim All KOL Tokens (${totalKOLs} KOLs from ${totalPacks} Packs)`
              }
            </span>
          </div>
        </button>
      </div>

      {/* Transaction Results Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-gray-900 rounded-2xl border border-gray-700 p-6 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  Token Claim Results
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Total Packs:</span>
                      <span className="text-white ml-2 font-medium">{totalPacks}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Total KOLs:</span>
                      <span className="text-white ml-2 font-medium">{totalKOLs}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Transactions:</span>
                      <span className="text-white ml-2 font-medium">{transactionResults.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Success Rate:</span>
                      <span className="text-green-400 ml-2 font-medium">
                        {transactionResults.length > 0 
                          ? `${Math.round((transactionResults.filter(r => r.success).length / transactionResults.length) * 100)}%`
                          : '0%'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">Transaction Details</h3>
                  {transactionResults.map((result, index) => (
                    <div
                      key={index}
                      className={cn(
                        "bg-gray-800 rounded-lg p-4 border-l-4",
                        result.success ? "border-green-500" : "border-red-500"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {result.success ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-white font-medium">
                              Transaction {index + 1}
                            </span>
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              result.success 
                                ? "bg-green-500/20 text-green-400" 
                                : "bg-red-500/20 text-red-400"
                            )}>
                              {result.success ? "Success" : "Failed"}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-300 mb-2">
                            <span className="font-medium">Packs claimed: </span>
                            {result.packsInTransaction.join(", ")}
                          </div>

                          {result.success && result.signature && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-400">Signature:</span>
                              <code className="text-blue-400 font-mono text-xs break-all">
                                {result.signature.substring(0, 20)}...{result.signature.slice(-20)}
                              </code>
                              <a
                                href={`https://orb.helius.dev/tx/${result.signature}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          )}

                          {!result.success && result.error && (
                            <div className="text-sm text-red-400">
                              <span className="font-medium">Error: </span>
                              {result.error}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Loader component
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

// Check icon component
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