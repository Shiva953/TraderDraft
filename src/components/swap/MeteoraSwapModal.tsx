"use client";

import React, { useState, useEffect } from "react";
import { ArrowUpDown } from "lucide-react";
import { Connection, Transaction, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { toast } from "sonner";
import BN from "bn.js";
import { Buffer } from "buffer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/app/hooks/useWallet";

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
  mode?: 'buy' | 'sell';
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
  activeCompetitionId,
  mode = 'buy'
}: MeteoraSwapModalProps) {
  const { fullAddress: userWallet, isConnected, signTransaction } = useWallet();

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

  // Fetch quote when input amount changes
  useEffect(() => {
    // Only fetch quotes when modal is open
    if (!isOpen) {
      return;
    }

    const fetchQuote = async () => {
      // Determine which amount to use based on mode
      const inputAmount = mode === 'buy' ? solAmount : kolAmount;

      if (!inputAmount || parseFloat(inputAmount) <= 0 || !userWallet) {
        if (mode === 'buy') {
          setKolAmount("0");
        } else {
          setSolAmount("0");
        }
        return;
      }

      setIsLoadingQuote(true);
      try {
        // Convert amount to smallest unit (lamports for SOL, or token decimals for KOL)
        const amountInSmallestUnit = Math.floor(parseFloat(inputAmount) * (mode === 'buy' ? LAMPORTS_PER_SOL : Math.pow(10, 6)));

        const response = await fetch('/api/getMeteoraQuote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            poolAddress,
            inputTokenMint: mode === 'buy' ? NATIVE_SOL_MINT : kolTokenMint,
            outputTokenMint: mode === 'buy' ? kolTokenMint : NATIVE_SOL_MINT,
            amountIn: amountInSmallestUnit.toString(),
            slippage: 0.5, // 0.5% slippage
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get quote');
        }

        const data = await response.json();
        if (data.success) {
          setQuote(data.data.quote);
          // Convert from smallest unit to display format
          const outputAmount = new BN(data.data.quote.swapOutAmount);
          // Use appropriate decimals based on output token (SOL = 9 decimals, KOL = 6 decimals)
          const decimals = mode === 'buy' ? 6 : 9;
          const displayAmount = outputAmount.toNumber() / Math.pow(10, decimals);

          if (mode === 'buy') {
            setKolAmount(displayAmount.toFixed(6));
          } else {
            setSolAmount(displayAmount.toFixed(6));
          }
        }
      } catch (error) {
        console.error("Error fetching quote:", error);
        // Don't show toast on quote errors during typing
        if (mode === 'buy') {
          setKolAmount("0");
        } else {
          setSolAmount("0");
        }
      } finally {
        setIsLoadingQuote(false);
      }
    };

    // Debounce quote fetching
    const timer = setTimeout(() => {
      fetchQuote();
    }, 500);

    return () => clearTimeout(timer);
  }, [isOpen, solAmount, kolAmount, poolAddress, kolTokenMint, userWallet, mode]);

  const setPercentage = (percent: number) => {
    if (mode === 'buy') {
      const balance = parseFloat(userBalance);
      if (balance > 0) {
        // Reserve 0.01 SOL for fees
        const availableBalance = Math.max(0, balance - 0.01);
        const amount = (availableBalance * percent / 100).toFixed(4);
        setSolAmount(amount);
      }
    } else {
      // Sell mode - use KOL token balance (already in display format)
      const balance = parseFloat(currentUserShares);
      if (balance > 0) {
        const amount = (balance * percent / 100).toFixed(2);
        setKolAmount(amount);
      }
    }
  };

  const handleSwap = async () => {
    if (!userWallet || !isConnected) {
      toast.error("Please connect your wallet");
      return;
    }

    // Validate input based on mode
    const inputAmount = mode === 'buy' ? solAmount : kolAmount;
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Check balance based on mode
    if (mode === 'buy') {
      if (parseFloat(solAmount) > parseFloat(userBalance) - 0.01) {
        toast.error("Insufficient balance (reserve 0.01 SOL for fees)");
        return;
      }
    } else {
      // currentUserShares is already in display format
      if (parseFloat(kolAmount) > parseFloat(currentUserShares)) {
        toast.error("Insufficient KOL token balance");
        return;
      }
    }

    setIsSwapping(true);
    const loadingToast = toast.loading("Preparing swap transaction...");

    try {
      // Convert amount to smallest unit based on mode
      const amountInSmallestUnit = Math.floor(
        parseFloat(inputAmount) * (mode === 'buy' ? LAMPORTS_PER_SOL : Math.pow(10, 6))
      );

      console.log(`🔄 Requesting ${mode} swap transaction...`);
      const response = await fetch('/api/swapMeteoraToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poolAddress,
          inputTokenMint: mode === 'buy' ? NATIVE_SOL_MINT : kolTokenMint,
          outputTokenMint: mode === 'buy' ? kolTokenMint : NATIVE_SOL_MINT,
          amountIn: amountInSmallestUnit.toString(),
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

      // Deserialize legacy transaction from Meteora SDK
      const txBuffer = Buffer.from(data.data.transaction, 'base64');
      const transaction = Transaction.from(txBuffer);

      console.log("🟡 Requesting signature from Privy wallet...");

      // Sign transaction using the hook's method (includes getAccessToken)
      const signedTx = await signTransaction(transaction);

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
      console.log("🏆 [Competition] Check conditions:", {
        activeCompetitionId,
        traderId,
        kolAmount,
        parsedKolAmount: parseFloat(kolAmount),
        shouldRegister: !!(activeCompetitionId && traderId && kolAmount && parseFloat(kolAmount) > 0)
      });

      if (activeCompetitionId && traderId && kolAmount && parseFloat(kolAmount) > 0) {
        try {
          console.log("🏆 [Competition] Registering KOL purchase in competition...");
          console.log("🏆 [Competition] Request URL:", `/api/competitions/${activeCompetitionId}/buyKOLToken`);
          console.log("🏆 [Competition] Request body:", {
            userPrivyWalletAddress: userWallet,
            traderId,
            tokenAmount: parseFloat(kolAmount),
            purchasePrice: parseFloat(solAmount),
            transactionHash: signature
          });

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
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {mode === 'buy' ? `Buy ${kolName} Shares` : `Sell ${kolName} Shares`}
          </DialogTitle>
        </DialogHeader>
  
        <div className="space-y-3 mt-4">
          {/* You Pay Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">You Pay</span>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPercentage(25)}
                  disabled={isSwapping}
                  className="h-6 px-2 text-xs"
                >
                  25%
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPercentage(50)}
                  disabled={isSwapping}
                  className="h-6 px-2 text-xs"
                >
                  50%
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPercentage(100)}
                  disabled={isSwapping}
                  className="h-6 px-2 text-xs"
                >
                  MAX
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <Input
                type="number"
                value={mode === 'buy' ? solAmount : kolAmount}
                onChange={(e) => mode === 'buy' ? setSolAmount(e.target.value) : setKolAmount(e.target.value)}
                className="flex-1 border-none h-auto p-0 text-2xl font-semibold bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder={mode === 'buy' ? "0.1" : "0"}
                step="any"
                min="0"
                disabled={isSwapping}
              />
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-7 h-7 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-sm">{mode === 'buy' ? '◎' : kolName.charAt(0)}</span>
                </div>
                <span className="text-sm font-medium">{mode === 'buy' ? 'SOL' : kolName}</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground px-1">
              Balance: {mode === 'buy'
                ? `${userBalance} SOL`
                : `${parseFloat(currentUserShares).toLocaleString()} ${kolName}`}
            </div>
          </div>
  
          {/* Swap Icon */}
          <div className="flex justify-center -my-1">
            <div className="bg-muted/50 p-2 rounded-full">
              <ArrowUpDown className="text-muted-foreground" size={16} />
            </div>
          </div>
  
          {/* You Receive Section */}
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground px-1">You Receive</span>
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between gap-2">
                <div className="text-2xl font-semibold overflow-hidden">
                  {isLoadingQuote ? (
                    <div className="animate-pulse bg-muted rounded h-8 w-24"></div>
                  ) : (
                    <span>{mode === 'buy' ? Number(kolAmount).toFixed(2) : Number(solAmount).toFixed(4)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-7 h-7 bg-muted rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold">{mode === 'buy' ? 'KOL' : '◎'}</span>
                  </div>
                  <span className="text-sm font-medium">{mode === 'buy' ? kolName.toUpperCase() : 'SOL'}</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground px-1">
              {mode === 'buy'
                ? `Your shares: ${parseFloat(currentUserShares).toLocaleString()}`
                : `Balance: ${userBalance} SOL`}
            </div>
          </div>
  
          {/* Fee Information */}
          {quote && (
            <div className="p-2.5 rounded-lg bg-muted/30 space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Price Impact</span>
                <span className="font-medium">
                  {typeof quote.priceImpact === 'number'
                    ? quote.priceImpact.toFixed(4)
                    : parseFloat(quote.priceImpact).toFixed(4)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">LP Fee (5%)</span>
                <span className="font-medium">{(parseFloat(kolAmount) * 0.05).toFixed(4)} {kolName.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network Fee</span>
                <span className="font-medium">~0.000005 SOL</span>
              </div>
            </div>
          )}
  
          {/* Swap Button */}
          <Button
            onClick={handleSwap}
            disabled={isSwapping || isLoadingQuote || !solAmount || parseFloat(solAmount) <= 0 || !userWallet}
            className="cursor-pointer w-full mt-2"
            size="lg"
          >
            {isSwapping ? "Swapping..." : isLoadingQuote ? "Loading..." : mode === 'buy' ? "Buy Now" : "Sell Now"}
          </Button>
  
          {/* Exchange Rate */}
          {quote && (
            <div className="text-xs text-muted-foreground text-center">
              1 {kolName.toUpperCase()} ≈ {(parseFloat(solAmount) / parseFloat(kolAmount)).toFixed(6)} SOL
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );  
}