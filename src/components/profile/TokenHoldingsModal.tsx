'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X } from 'lucide-react'
import type { TokenHolding } from '@/types'

interface TokenHoldingsModalProps {
  isOpen: boolean
  onClose: () => void
  tokenHoldings: TokenHolding[]
  loading?: boolean
}

export default function TokenHoldingsModal({ isOpen, onClose, tokenHoldings, loading = false }: TokenHoldingsModalProps) {
  const scrollableRef = useRef<HTMLDivElement>(null)
  const modalContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus the modal content to enable immediate scrolling
      // Use setTimeout to ensure DOM is ready and focus trap can be broken
      const focusTimeout = setTimeout(() => {
        if (scrollableRef.current) {
          scrollableRef.current.focus();
        } else if (modalContentRef.current) {
          modalContentRef.current.focus();
        }
      }, 50);
      
      return () => {
        clearTimeout(focusTimeout);
        document.body.style.overflow = 'unset';
      };
    } else {
      document.body.style.overflow = 'unset';
    }
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalContentRef}
        className="relative w-full max-w-2xl max-h-[80vh] bg-[#0A0A0A] border border-neutral-800 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <h2 className="text-md font-medium text-white">KOL Holdings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-800 transition-colors duration-200"
          >
            <X className="h-5 w-5 text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div 
          ref={scrollableRef}
          tabIndex={0}
          className="overflow-y-auto max-h-[calc(80vh-120px)] focus:outline-none"
        >
          {loading ? (
            /* Loading skeleton while fetching holdings */
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-neutral-800" />
                    <div className="h-4 w-20 bg-neutral-800 rounded" />
                  </div>
                  <div className="text-right space-y-2">
                    <div className="h-4 w-16 bg-neutral-800 rounded ml-auto" />
                    <div className="h-3 w-12 bg-neutral-800 rounded ml-auto" />
                  </div>
                </div>
              ))}
              <div className="text-center text-neutral-500 text-sm mt-4">
                🔄 Fetching your holdings...
              </div>
            </div>
          ) : tokenHoldings.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-neutral-400">No token holdings found</p>
            </div>
          ) : (
            <div className="p-6 space-y-3 font-[family-name:var(--font-roboto-mono)]">
              {tokenHoldings.map((holding, index) => (
                <div
                  key={`${holding.mintAddress}-${index}`}
                  className="relative group flex items-center justify-between px-4 py-3 rounded-lg border border-neutral-800 bg-[#0A0A0A] overflow-hidden transition-all duration-200 hover:border-neutral-700 hover:bg-[#0F0F0F] cursor-pointer"
                >
                  {/* Top-left white radial gradient */}
                  <div
                    className="absolute top-0 left-0 w-32 h-32 rounded-full opacity-[0.02] pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle at top left, white 0%, transparent 70%)',
                    }}
                  />

                  <div className="flex items-center gap-3 relative z-10">
                    {holding.avatarUrl ? (
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-800 ring-2 ring-neutral-700/50">
                        <Image
                          src={holding.avatarUrl}
                          alt={holding.ticker}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-neutral-700/50">
                        {holding.ticker.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-white text-sm font-medium">{holding.ticker}</span>
                      <span className="text-neutral-500 text-xs">
                        {formatBalance(holding.balance)} {holding.ticker}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      // Navigate to the KOL page
                      window.location.href = `/kols/${holding.ticker}`;
                    }}
                    className="relative z-10 px-3 py-1.5 text-xs font-medium rounded-md bg-[#F78BB4] hover:bg-[#F9A0C3] text-white transition-all duration-200 cursor-pointer"
                  >
                    Buy
                  </button>
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
