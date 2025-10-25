"use client"

import { useState } from "react"
import { usePackPurchase } from "@/app/hooks/usePackPurchase"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Copy, ExternalLink, CheckCircle2, Loader2, Package } from "lucide-react"

interface BuyPackModalProps {
  isOpen: boolean
  onClose: () => void
  onPurchaseComplete?: () => void
}

export default function BuyPackModal({ isOpen, onClose, onPurchaseComplete }: BuyPackModalProps) {
  const [packCount, setPackCount] = useState(1)
  const { isLoading, txnHash, showSuccess, error, purchasePacks, resetState } = usePackPurchase()

  const totalPrice = packCount * 0.1
  const maxPacks = 250

  const handleBuyPacks = async () => {
    if (packCount <= 0) return

    const success = await purchasePacks(packCount, totalPrice)
    if (success && onPurchaseComplete) {
      onPurchaseComplete()
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      resetState()
      setPackCount(1)
    }
  }

  const copyToClipboard = () => {
    if (txnHash) {
      navigator.clipboard.writeText(txnHash)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-neutral-900 border-neutral-800 text-white">
        {!showSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-400" />
                Buy KOL Packs
              </DialogTitle>
            </DialogHeader>

            <Separator className="bg-neutral-800" />

            {error && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-800">
                <AlertDescription className="text-red-400 text-sm flex items-center justify-between">
                  <span>{error}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={resetState}
                    className="h-6 w-6 p-0 hover:bg-red-800/20"
                  >
                    ✕
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {/* Pack Quantity */}
              <Card className="bg-neutral-800/50 border-neutral-700 p-4">
                <div className="mb-2">
                  <span className="text-sm text-neutral-400 uppercase tracking-wider">Quantity</span>
                </div>
                <div className="text-4xl font-bold text-white mb-3 text-center">{packCount}</div>
                <Slider
                  value={[packCount]}
                  onValueChange={(value) => setPackCount(value[0])}
                  max={maxPacks}
                  min={1}
                  step={1}
                  className="mb-2"
                  disabled={isLoading}
                />
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>1</span>
                  <span>{maxPacks} max</span>
                </div>
              </Card>

              {/* Price and Receive in one row */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-neutral-800/50 border-neutral-700 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-neutral-400 uppercase tracking-wider">You Pay</span>
                    <img src="/solana.png" alt="SOL" className="w-5 h-5 rounded-full" />
                  </div>
                  <div className="text-2xl font-bold text-white">{totalPrice.toFixed(2)} SOL</div>
                  <div className="text-xs text-neutral-500 mt-1">0.10 SOL each</div>
                </Card>

                <Card className="bg-neutral-800/50 border-neutral-700 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-neutral-400 uppercase tracking-wider">You Receive</span>
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs">
                      KOL
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-white">{packCount} {packCount === 1 ? 'Pack' : 'Packs'}</div>
                  <div className="text-xs text-neutral-500 mt-1">4 tokens each</div>
                </Card>
              </div>

              {/* Buy Button */}
              <Button
                onClick={handleBuyPacks}
                disabled={isLoading || packCount === 0}
                size="lg"
                className="w-full bg-white text-black font-semibold cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Buy ${packCount} Pack${packCount !== 1 ? "s" : ""} for ${totalPrice.toFixed(2)} SOL`
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white text-center flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-400" />
                </div>
                Purchase Successful!
              </DialogTitle>
            </DialogHeader>

            <Separator className="bg-neutral-800" />

            <div className="space-y-4 text-center">
              <div className="space-y-1">
                <p className="text-neutral-400 text-sm">
                  Your packs will be revealed on
                </p>
                <Badge variant="outline" className="text-base px-3 py-1 border-neutral-700 text-white">
                  20th November, 2025
                </Badge>
              </div>

              <Card className="bg-neutral-800/50 border-neutral-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span className="text-xs text-green-400 uppercase tracking-wider">Confirmed</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{packCount} {packCount === 1 ? 'Pack' : 'Packs'}</div>
                    <div className="text-xs text-neutral-500 uppercase mt-1">KOL Packs</div>
                  </div>
                  <Package className="h-10 w-10 text-purple-400" />
                </div>
              </Card>

              {txnHash && (
                <Card className="bg-neutral-800/50 border-neutral-700 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-neutral-400 uppercase tracking-wider">Transaction</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={copyToClipboard}
                        className="h-7 px-2 hover:bg-neutral-700"
                      >
                        <Copy className="h-3 w-3 text-neutral-400" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`https://explorer.solana.com/tx/${txnHash}?cluster=devnet`, '_blank')}
                        className="h-7 px-2 hover:bg-neutral-700"
                      >
                        <ExternalLink className="h-3 w-3 text-neutral-400" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-white font-mono bg-neutral-900 rounded px-3 py-2 break-all border border-neutral-800">
                    {txnHash.substring(0, 20)}...{txnHash.substring(txnHash.length - 20)}
                  </div>
                </Card>
              )}

              <Button
                onClick={handleClose}
                size="lg"
                className="w-full bg-white text-black hover:bg-neutral-200 font-semibold cursor-pointer"
              >
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}