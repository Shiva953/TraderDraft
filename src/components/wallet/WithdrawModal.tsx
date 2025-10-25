"use client";

import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ClipboardPaste } from "lucide-react";
import { useWallet } from "@/app/hooks/useWallet";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { toast } from "sonner";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBalance: number; // SOL balance
}

export default function WithdrawModal({
  isOpen,
  onClose,
  userBalance,
}: WithdrawModalProps) {
  const [withdrawalAddress, setWithdrawalAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { fullAddress: userWalletAddress, signTransaction } = useWallet();

  const handlePasteAddress = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setWithdrawalAddress(text);
    } catch (err) {
      console.error("Failed to paste from clipboard:", err);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawalAddress || !amount) {
      toast.error("Please enter both withdrawal address and amount");
      return;
    }

    try {
      setIsProcessing(true);

      // Validate Solana address
      try {
        new PublicKey(withdrawalAddress);
      } catch {
        toast.error("Invalid Solana address");
        setIsProcessing(false);
        return;
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        toast.error("Invalid amount");
        setIsProcessing(false);
        return;
      }

      if (amountNum > userBalance) {
        toast.error("Insufficient balance");
        setIsProcessing(false);
        return;
      }

      // Check if wallet is connected
      if (!userWalletAddress) {
        toast.error("No Solana wallet found");
        setIsProcessing(false);
        return;
      }

      // Show loading toast
      const loadingToast = toast.loading("Withdrawing...");

      // Step 1: Get unsigned transaction from backend
      const response = await fetch("/api/user/wallet/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toAddress: withdrawalAddress,
          amount: amountNum,
          userWalletAddress: userWalletAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Withdrawal failed");
      }

      // Step 2: Deserialize transaction
      const transactionBuffer = Buffer.from(data.transaction, "base64");
      const transaction = Transaction.from(transactionBuffer);

      // Step 3: Sign transaction with user's wallet using useWallet hook
      const signedTx = await signTransaction(transaction);

      // Step 4: Send signed transaction
      const connection = new Connection(
        "https://devnet.helius-rpc.com/?api-key=017f56ed-c6c1-480a-8c11-dbc09ab2358d",
        "confirmed"
      );

      const signature = await connection.sendRawTransaction(signedTx.serialize());

      await connection.confirmTransaction(signature);

      toast.success(`Successfully withdrew ${amountNum} SOL!`, {
        id: loadingToast,
        description: `Transaction: ${signature.slice(0, 8)}...${signature.slice(-8)}`
      });

      onClose();
      setWithdrawalAddress("");
      setAmount("");
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      toast.error("Withdrawal failed", {
        description: error.message || "An error occurred during withdrawal"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className={`${inter.className} max-w-lg max-h-[85vh] p-0 bg-black border-neutral-800 overflow-hidden flex flex-col`}>
        {/* Top glow effect */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none z-0" />

        {/* Header */}
        <div className="relative flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold text-white">SOL Withdrawal</h2>
          </div>
        </div>

        {/* Content */}
        <div className="relative p-4 space-y-4 overflow-y-auto flex-1">
          {/* Title Section */}
          <div className="text-center space-y-1">
            <h3 className="text-lg font-semibold text-white">
              Enter Withdrawal Address
            </h3>
            <p className="text-sm text-neutral-400">
              Enter the SOL address where you'd like to receive your funds
            </p>
          </div>

          {/* Withdrawal Form Card */}
          <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/50 space-y-4">
            {/* Withdrawal Address Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Withdrawal Address
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Enter Solana address"
                  value={withdrawalAddress}
                  onChange={(e) => setWithdrawalAddress(e.target.value)}
                  className="h-10 pr-10 bg-neutral-800/50 border-neutral-700 text-white placeholder:text-neutral-500 text-sm"
                  spellCheck="false"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                />
                <button
                  onClick={handlePasteAddress}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ClipboardPaste className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Amount (SOL)
              </label>
              <Input
                type="number"
                step="0.001"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 bg-neutral-800/50 border-neutral-700 text-white placeholder:text-neutral-500 text-sm"
              />
              <p className="text-[10px] text-neutral-500">
                Available balance: {userBalance.toFixed(4)} SOL
              </p>
            </div>

            {/* Important Warning */}
            <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-900/50">
              <p className="text-xs text-amber-400">
                <span className="font-medium">Important:</span> Only send to
                Solana addresses that support SOL. Funds sent to incorrect
                networks or unsupported wallets cannot be recovered.
              </p>
            </div>

            {/* Note Warning */}
            <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-900/50">
              <p className="text-xs text-amber-400">
                <span className="font-medium">Note:</span> To withdraw SOL, you
                must send under your total amount of SOL to pay for gas.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="relative p-4 pt-3 space-y-2 border-t border-neutral-800 shrink-0">
          <Button
            onClick={handleWithdraw}
            disabled={isProcessing || !withdrawalAddress || !amount}
            className="w-full h-11 text-base font-medium bg-neutral-200 text-black hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isProcessing ? "Processing..." : "Withdraw"}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full h-11 text-base font-medium bg-transparent border-neutral-700 text-white hover:bg-neutral-900 cursor-pointer"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
