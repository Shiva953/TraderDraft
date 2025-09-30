'use client'

import { X, Link as LinkIcon } from 'lucide-react'
import type { TokenHolding } from '@/types'

interface TokenHoldingsModalProps {
  isOpen: boolean
  onClose: () => void
  tokenHoldings: TokenHolding[]
}

export default function TokenHoldingsModal({ isOpen, onClose, tokenHoldings }: TokenHoldingsModalProps) {
  if (!isOpen) return null

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

  const getSolscanLink = (mintAddress: string) =>
    `https://orb.helius.dev/address/${mintAddress}?cluster=devnet`

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-white">KOL Token Holdings</h2>
            {tokenHoldings.length > 0 && (
              <a
                href={getSolscanLink(tokenHoldings[0].mintAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 inline-flex items-center px-2 py-1 rounded hover:bg-neutral-800 transition-colors"
                title="View first token mint on Solscan"
              >
                <LinkIcon className="h-4 w-4 text-blue-400" />
                <span className="sr-only">View on Solscan</span>
              </a>
            )}
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
            <div className="p-6 space-y-4">
              {tokenHoldings.map((holding, index) => (
                <div
                  key={`${holding.mintAddress}-${index}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 transition-colors duration-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                        {holding.ticker.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <h3 className="font-semibold text-white">{holding.ticker}</h3>
                          <a
                            href={getSolscanLink(holding.mintAddress)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-1 rounded hover:bg-neutral-700 transition-colors"
                            title="View token mint on Solscan"
                          >
                            <LinkIcon className="h-4 w-4 text-blue-400" />
                            <span className="sr-only">View on Solscan</span>
                          </a>
                        </div>
                        <p className="text-sm text-neutral-400">{holding.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-white">
                      {formatBalance(holding.balance)} {holding.ticker}
                    </p>
                    {holding.tokenPrice && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-neutral-400">
                          ${parseFloat(holding.tokenPrice).toFixed(6)}
                        </span>
                        {holding.priceChange24hPercent !== undefined && (
                          <span
                            className={`font-medium ${
                              holding.priceChange24hPercent >= 0
                                ? 'text-green-500'
                                : 'text-red-500'
                            }`}
                          >
                            {holding.priceChange24hPercent >= 0 ? '+' : ''}
                            {holding.priceChange24hPercent.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-800 bg-neutral-900/50">
          <p className="text-xs text-neutral-500 text-center">
            Showing {tokenHoldings.length} token{tokenHoldings.length !== 1 ? 's' : ''} with non-zero balance
          </p>
        </div>
      </div>
    </div>
  )
}