'use client'

import { useState, useEffect } from 'react'
import { X, ExternalLink, Copy, Check } from 'lucide-react'

interface TokenHolding {
  ticker: string
  name: string
  balance: string
  mintAddress: string
  poolAddress?: string
  tokenPrice?: string
  priceChange24h?: string
  priceChange24hPercent?: number
}

interface TokenHoldingsModalProps {
  isOpen: boolean
  onClose: () => void
  userPrivyWalletAddress: string
}

export default function TokenHoldingsModal({ isOpen, onClose, userPrivyWalletAddress }: TokenHoldingsModalProps) {
  const [holdings, setHoldings] = useState<TokenHolding[]>([])
  const [loading, setLoading] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  const fetchTokenHoldings = async () => {
    if (!userPrivyWalletAddress) return

    setLoading(true)
    try {
      const response = await fetch('/api/getUserKOLTokenHoldings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrivyWalletAddress,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setHoldings(data.data.holdings)
      }
    } catch (error) {
      console.error('Error fetching token holdings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchTokenHoldings()
    }
  }, [isOpen, userPrivyWalletAddress])

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedAddress(type)
      setTimeout(() => setCopiedAddress(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance) / Math.pow(10, 6) // Divide by 10^6 for 6 decimals
    if (num === 0) return '0'
    if (num < 0.000001) return '< 0.000001'
    return num.toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 6 
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800 flex-shrink-0">
          <h2 className="text-xl font-semibold text-white">Your KOL Token Holdings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-800 transition-colors duration-200"
          >
            <X className="h-5 w-5 text-neutral-400" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="ml-3 text-neutral-400">Loading holdings...</span>
            </div>
          ) : holdings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Token Holdings</h3>
              <p className="text-neutral-400">You don't have any KOL tokens yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {holdings.map((holding, index) => (
                <div key={index} className="rounded-lg bg-neutral-800/50 p-4 border border-neutral-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                        {holding.ticker.substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{holding.ticker}</h4>
                        <p className="text-sm text-neutral-400">{holding.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">{formatBalance(holding.balance)}</p>
                      {holding.tokenPrice && (
                        <p className="text-sm text-neutral-400">
                          ${parseFloat(holding.tokenPrice).toFixed(6)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span>Mint:</span>
                    <code className="bg-neutral-900 px-2 py-1 rounded text-neutral-300">
                      {holding.mintAddress.substring(0, 8)}...{holding.mintAddress.substring(holding.mintAddress.length - 8)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(holding.mintAddress, `mint-${index}`)}
                      className="p-1 hover:bg-neutral-700 rounded transition-colors duration-200"
                    >
                      {copiedAddress === `mint-${index}` ? (
                        <Check className="h-3 w-3 text-green-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                    <a
                      href={`https://solscan.io/token/${holding.mintAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-neutral-700 rounded transition-colors duration-200"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
