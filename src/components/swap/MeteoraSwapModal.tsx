"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, ArrowUpDown } from "lucide-react";
import { Connection, Transaction, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { toast } from "sonner";
import BN from "bn.js";
import { Buffer } from "buffer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MeteoraSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  kolName: string;
  kolTokenMint: string;
  poolAddress: string;
  onSwapSuccess: () => void;
  currentUserShares?: string;
  traderId?: string;
  activeCompetitionId?: string | null;
}

const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112";
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

export default function MeteoraSwapModal({
  isOpen,
  onClose,
  kolName,
  kolTokenMint,
  poolAddress,
  onSwapSuccess,
  currentUserShares = "0",
  traderId,
  activeCompetitionId
}: MeteoraSwapModalProps) {
  const { wallets } = useSolanaWallets();
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const userWallet = embeddedWallet?.address;

  const [solAmount, setSolAmount] = useState("0.1");
  const [kolAmount, setKolAmount] = useState("0");
  const [userBalance, setUserBalance] = useState<string>("0");
  const [isSwapping, setIsSwapping] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quote, setQuote] = useState<any>(null);

  // Fetch user's SOL balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!userWallet) return;

      try {
        const balance = await connection.getBalance(new PublicKey(userWallet));
        setUserBalance((balance / LAMPORTS_PER_SOL).toFixed(4));
      } catch (error) {
        console.error("Error fetching balance:", error);
      }
    };

    if (isOpen && userWallet) {
      fetchBalance();
    }
  }, [isOpen, userWallet]);

  // Fetch quote when SOL amount changes
  useEffect(() => {
    // Only fetch quotes when modal is open
    if (!isOpen) {
      return;
    }

    const fetchQuote = async () => {
      if (!solAmount || parseFloat(solAmount) <= 0 || !userWallet) {
        setKolAmount("0");
        return;
      }

      setIsLoadingQuote(true);
      try {
        // Convert SOL amount to lamports
        const amountInLamports = Math.floor(parseFloat(solAmount) * LAMPORTS_PER_SOL);

        const response = await fetch('/api/getMeteoraQuote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            poolAddress,
            inputTokenMint: NATIVE_SOL_MINT,
            outputTokenMint: kolTokenMint,
            amountIn: amountInLamports.toString(),
            slippage: 0.5, // 0.5% slippage
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get quote');
        }

        const data = await response.json();
        if (data.success) {
          setQuote(data.data.quote);
          // Convert from smallest unit (6 decimals) to display format
          const outputAmount = new BN(data.data.quote.swapOutAmount);
          const displayAmount = outputAmount.toNumber() / Math.pow(10, 6);
          setKolAmount(displayAmount.toFixed(6));
        }
      } catch (error) {
        console.error("Error fetching quote:", error);
        // Don't show toast on quote errors during typing
        setKolAmount("0");
      } finally {
        setIsLoadingQuote(false);
      }
    };

    // Debounce quote fetching
    const timer = setTimeout(() => {
      fetchQuote();
    }, 500);

    return () => clearTimeout(timer);
  }, [isOpen, solAmount, poolAddress, kolTokenMint, userWallet]);

  const setPercentage = (percent: number) => {
    const balance = parseFloat(userBalance);
    if (balance > 0) {
      // Reserve 0.01 SOL for fees
      const availableBalance = Math.max(0, balance - 0.01);
      const amount = (availableBalance * percent / 100).toFixed(4);
      setSolAmount(amount);
    }
  };

  const handleSwap = async () => {
    if (!userWallet || !embeddedWallet) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!solAmount || parseFloat(solAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (parseFloat(solAmount) > parseFloat(userBalance) - 0.01) {
      toast.error("Insufficient balance (reserve 0.01 SOL for fees)");
      return;
    }

    setIsSwapping(true);
    const loadingToast = toast.loading("Preparing swap transaction...");

    try {
      // Convert SOL amount to lamports
      const amountInLamports = Math.floor(parseFloat(solAmount) * LAMPORTS_PER_SOL);

      console.log("🔄 Requesting swap transaction...");
      const response = await fetch('/api/swapMeteoraToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poolAddress,
          inputTokenMint: NATIVE_SOL_MINT,
          outputTokenMint: kolTokenMint,
          amountIn: amountInLamports.toString(),
          slippage: 0.5,
          userWallet
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to build swap transaction');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Swap failed');
      }

      console.log("📝 Transaction received from server, signing...");
      toast.loading("Please sign the transaction in your wallet...", { id: loadingToast });

      // Refresh wallet session before signing
      try {
        await embeddedWallet.loginOrLink();
      } catch (refreshError) {
        console.warn("⚠️ Session refresh failed, continuing anyway:", refreshError);
      }

      // Deserialize legacy transaction from Meteora SDK
      const txBuffer = Buffer.from(data.data.transaction, 'base64');
      const transaction = Transaction.from(txBuffer);

      console.log("🟡 Requesting signature from Privy wallet...");

      // Sign transaction using Privy's signTransaction (NOT sendTransaction to avoid CORS)
      const signedTx = await embeddedWallet.signTransaction(transaction);

      console.log("✅ Transaction signed, sending to network...");
      toast.loading("Sending transaction to network...", { id: loadingToast });

      // Send the signed transaction ourselves
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });

      console.log("📤 Transaction sent:", signature);
      toast.loading("Confirming transaction...", { id: loadingToast });

      // Confirm the transaction ourselves
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: data.data.blockhash,
        lastValidBlockHeight: data.data.lastValidBlockHeight
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error('Transaction failed on-chain');
      }

      console.log("✅ Swap confirmed:", signature);

      // If there's an active competition, register the KOL purchase
      let isFirstCompetitionEntry = false;
      if (activeCompetitionId && traderId && kolAmount && parseFloat(kolAmount) > 0) {
        try {
          console.log("🏆 [Competition] Registering KOL purchase in competition...");
          const buyKOLResponse = await fetch(`/api/competitions/${activeCompetitionId}/buyKOLToken`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userPrivyWalletAddress: userWallet,
              traderId,
              tokenAmount: parseFloat(kolAmount),
              purchasePrice: parseFloat(solAmount),
              transactionHash: signature
            }),
          });

          if (buyKOLResponse.ok) {
            const buyKOLData = await buyKOLResponse.json();
            console.log("✅ [Competition] KOL purchase registered:", buyKOLData);
            isFirstCompetitionEntry = buyKOLData.data?.competitionJoined || false;
          } else {
            console.warn("⚠️ [Competition] Failed to register KOL purchase:", await buyKOLResponse.text());
          }
        } catch (competitionError) {
          console.error("❌ [Competition] Error registering KOL purchase:", competitionError);
        }
      }

      toast.success(
        <div>
          <div className="font-bold">Swap Successful!</div>
          <div className="text-xs mt-1">
            <a
              href={`https://orb.helius.dev/tx/${signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View Transaction
            </a>
          </div>
        </div>,
        { id: loadingToast, duration: 5000 }
      );

      // Show competition entry toast if first entry
      if (isFirstCompetitionEntry) {
        setTimeout(() => {
          toast.success("🏆 Welcome to the Arena! You're now competing for Tournament Points!", { duration: 6000 });
        }, 1500);
      }

      // Update UI and close modal
      onSwapSuccess();
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      console.error("❌ Swap error:", error);
      toast.error(
        error instanceof Error ? error.message : "Swap failed. Please try again.",
        { id: loadingToast }
      );
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            Buy {kolName} Shares
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="space-y-4">
          {/* You Pay Section */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">You Pay</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPercentage(25)}
                  disabled={isSwapping}
                  className="h-7 px-2.5 text-xs"
                >
                  25%
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPercentage(50)}
                  disabled={isSwapping}
                  className="h-7 px-2.5 text-xs"
                >
                  50%
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPercentage(100)}
                  disabled={isSwapping}
                  className="h-7 px-2.5 text-xs"
                >
                  MAX
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                value={solAmount}
                onChange={(e) => setSolAmount(e.target.value)}
                className="flex-1 border-none h-auto outline-none bg-transparent placeholder:text-muted-foreground disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                placeholder="0.1"
                step="any"
                min="0"
                disabled={isSwapping}
                inputMode="decimal"
                pattern="[0-9]*"
                style={{
                  MozAppearance: 'textfield'
                }}
              />
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold">◎</span>
                </div>
                <span className="font-semibold whitespace-nowrap">SOL</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-3">
              Balance: {userBalance} SOL
            </div>
          </Card>

          {/* Swap Icon */}
          <div className="flex justify-center">
            <div className="bg-muted p-3 rounded-full">
              <ArrowUpDown className="text-muted-foreground" size={20} />
            </div>
          </div>

          {/* You Receive Section */}
          <Card className="p-4">
            <span className="text-muted-foreground text-sm">YOU RECEIVE</span>
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="text-5xl font-bold overflow-hidden text-ellipsis min-w-0 break-all">
                {isLoadingQuote ? (
                  <div className="animate-pulse bg-muted rounded h-12 w-32"></div>
                ) : (
                  <span className="block overflow-hidden text-ellipsis">{Number(kolAmount).toFixed(2).toString()}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">95</span>
                </div>
                <span className="font-medium whitespace-nowrap text-sm">{kolName.toUpperCase()}</span>
              </div>
            </div>
            <div className="text-muted-foreground text-sm mt-2 truncate">
              YOUR SHARES: {currentUserShares} {kolName.toUpperCase()}
            </div>
          </Card>

          {/* Fee Information */}
          {quote && (
            <Card className="p-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground items-center">
                <span>Price Impact</span>
                <Badge
                  variant="secondary"
                  className="shrink-0"
                >
                  {typeof quote.priceImpact === 'number'
                    ? quote.priceImpact.toFixed(4)
                    : parseFloat(quote.priceImpact).toFixed(4)}%
                </Badge>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Network Fee</span>
                <span className="truncate ml-2">~0.000005 SOL</span>
              </div>
            </Card>
          )}

          {/* Swap Button */}
          <Button
            onClick={handleSwap}
            disabled={isSwapping || isLoadingQuote || !solAmount || parseFloat(solAmount) <= 0 || !userWallet}
            className="cursor-pointer w-full py-6 rounded-full text-md"
            size="lg"
          >
            {isSwapping ? "Swapping..." : isLoadingQuote ? "Loading..." : "Buy Now"}
          </Button>

          {/* Exchange Rate */}
          {quote && (
            <div className="text-xs text-muted-foreground text-center">
              <span className="truncate">
                1 {kolName.toUpperCase()} ≈ {(parseFloat(solAmount) / parseFloat(kolAmount)).toFixed(6)} SOL
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
