"use client"

import { useEffect } from "react"
import { useOrders } from "@/app/hooks/useOrders"

interface ViewOrdersModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ViewOrdersModal({ isOpen, onClose }: ViewOrdersModalProps) {
  const { orders, loading, error, fetchOrders, totalPacks, totalValue } = useOrders()

  useEffect(() => {
    if (isOpen) {
      fetchOrders()
    }
  }, [isOpen, fetchOrders])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl rounded-2xl bg-gray-200 p-6 shadow-2xl font-mono">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-light text-gray-600 uppercase tracking-wide">Your Orders</h2>
          {!loading && orders.length > 0 && (
            <div className="mt-2 text-sm text-gray-500">
              {totalPacks} total packs • {totalValue.toFixed(2)} SOL spent
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
            <span className="ml-3 text-gray-600 font-light">Loading orders...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-light text-black mb-2">Error Loading Orders</h3>
            <p className="text-gray-600 font-light mb-4">{error}</p>
            <button 
              onClick={fetchOrders}
              className="px-4 py-2 bg-black text-white rounded-lg font-light hover:bg-gray-800"
            >
              Try Again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-light text-black mb-2">No Orders Yet</h3>
            <p className="text-gray-600 font-light">You haven't purchased any packs yet.</p>
          </div>
        ) : (
          <>
            {/* Scrollable orders container */}
            <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
              {orders.map((order) => {
                const orderDate = new Date(order.createdAt)
                const timeString = orderDate.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: false,
                })
                const dateString = orderDate
                  .toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                  .toUpperCase()

                return (
                  <div key={order.id} className="rounded-lg bg-gray-300 p-6">
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <div className="text-2xl font-light text-black">{timeString}</div>
                        <div className="text-sm text-gray-600 uppercase font-light">{dateString}</div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center relative">
                          <img 
                            src="/solana.png" 
                            alt="Solana" 
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                        </div>
                        <span className="text-2xl font-light text-black">{order.totalValue} SOL</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-red-500 rounded-full"></div>
                        <span className="text-2xl font-light text-black">{order.packsBought} Packs</span>
                      </div>

                      <div className="text-right">
                        <div className="text-lg text-gray-600 font-light">Completed</div>
                        {order.transactionHash && (
                          <button
                            onClick={() => navigator.clipboard.writeText(order.transactionHash!)}
                            className="text-xs text-gray-500 hover:text-gray-700 mt-1"
                            title="Copy transaction hash"
                          >
                            Copy TX
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6">
              <button className="w-full rounded-full cursor-pointer px-6 py-4 text-lg font-light text-white bg-black hover:bg-gray-800 transition-colors">
                Buy Again
              </button>
            </div>
          </>
        )}

        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-black transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}