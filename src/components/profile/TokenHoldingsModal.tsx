'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X } from 'lucide-react'
import type { TokenHolding } from '@/types'

interface TokenHoldingsModalProps {
  isOpen: boolean
  onClose: () => void
  tokenHoldings: TokenHolding[]
}

export default function TokenHoldingsModal({ isOpen, onClose, tokenHoldings }: TokenHoldingsModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatBalance = (balance: string) => {
    try {
      const num = BigInt(balance);

      const divisor = BigInt(10 ** 6);
      const wholePart = num / divisor;
      const fractionalPart = num % divisor;

      if (wholePart === BigInt(0) && fractionalPart > BigInt(0)) {
        return `0.${fractionalPart
          .toString()
          .padStart(6, '0')
          .replace(/0+$/, '')}`;
      }

      return wholePart.toString();
    } catch {
      return balance;
    }
  };


  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-[#0A0A0A] border border-neutral-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 bg-neutral-700 rounded" />
            <h2 className="text-sm font-medium text-neutral-400">KOL Holdings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-800 transition-colors duration-200"
          >
            <X className="h-5 w-5 text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
          {tokenHoldings.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-neutral-400">No token holdings found</p>
            </div>
          ) : (
            <div className="p-6 space-y-3 font-[family-name:var(--font-roboto-mono)]">
              {tokenHoldings.map((holding, index) => (
                <div
                  key={`${holding.mintAddress}-${index}`}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {holding.avatarUrl ? (
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-800">
                        <Image
                          src={holding.avatarUrl}
                          alt={holding.ticker}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                        {holding.ticker.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="text-white text-sm">{holding.ticker}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white text-sm font-medium">
                      {formatBalance(holding.balance)}
                    </div>
                    <div className="text-neutral-400 text-xs">{holding.ticker}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-800 bg-[#0A0A0A]">
          <p className="text-xs text-neutral-500 text-center">
            Showing {tokenHoldings.length} token{tokenHoldings.length !== 1 ? 's' : ''} with non-zero balance
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
