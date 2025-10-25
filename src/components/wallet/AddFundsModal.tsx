"use client";

import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Wallet, Copy, Check } from "lucide-react";
import QRCode from "react-qr-code";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

export default function AddFundsModal({
  isOpen,
  onClose,
  walletAddress,
}: AddFundsModalProps) {
  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className={`${inter.className} max-w-lg max-h-[85vh] p-0 bg-black border-neutral-800 overflow-hidden flex flex-col`}>
        {/* Top glow effect */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none z-0" />

        {/* Header */}
        <div className="relative flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-xl font-semibold text-white">Add Funds</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="relative p-4 overflow-y-auto flex-1">
          {/* USDC Transfer (Solana) Option */}
          <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/50">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 text-neutral-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-medium text-white mb-1">
                  USDC Transfer (Solana)
                </h3>
                <button
                  onClick={handleCopyAddress}
                  className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <span>Tap to copy: {truncatedAddress}</span>
                  {copiedAddress ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>

            {/* Warning Banner */}
            <div className="mb-4 p-2 rounded-lg bg-green-950/30 border border-green-900/50">
              <div className="flex items-start gap-2">
                <span className="text-base">⚠️</span>
                <p className="text-xs text-green-400">
                  Send USDC on Solana only. Other networks = lost funds.
                </p>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-lg">
                <QRCode value={walletAddress} size={150} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative p-4 pt-3 border-t border-neutral-800 shrink-0">
          <Button
            onClick={onClose}
            className="w-full h-11 text-base font-medium bg-neutral-200 text-black hover:bg-white cursor-pointer"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
