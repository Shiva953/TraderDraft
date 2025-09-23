import React, { useState } from 'react';
import { useUserPacks } from '@/app/hooks/useUserPacks';
import ViewOrdersModal from './ViewOrdersModal';

export default function UserPacks() {
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const { data: userPacks, loading, error, refresh, isConnected } = useUserPacks();

  // Don't render if not connected or no pack data
  if (!isConnected || !userPacks) return null;

  return (
    <>
      <div className="rounded-2xl bg-gray-200 p-6 font-mono">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-light text-gray-600 uppercase tracking-wide">Your Packs</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOrdersModal(true)}
              className="cursor-pointer px-4 py-2 text-sm font-light text-gray-600 hover:text-black transition-colors"
            >
              View Orders
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              className="cursor-pointer text-sm text-gray-500 hover:text-black transition-colors disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            Error: {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-gray-300 p-4">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-light mb-1">Total Packs</div>
            <div className="text-2xl font-light text-black">{userPacks.packHoldings}</div>
          </div>

          <div className="rounded-lg bg-gray-300 p-4">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-light mb-1">Total Value</div>
            <div className="text-2xl font-light text-black">{userPacks.totalValueOfPackHoldings} SOL</div>
          </div>

          <div className="rounded-lg bg-gray-300 p-4">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-light mb-1">Unclaimed</div>
            <div className="text-2xl font-light text-black">{userPacks.unclaimedPacks}</div>
          </div>

          <div className="rounded-lg bg-gray-300 p-4">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-light mb-1">Claimed</div>
            <div className="text-2xl font-light text-black">{userPacks.claimedPacks}</div>
          </div>
        </div>
      </div>

      <ViewOrdersModal isOpen={showOrdersModal} onClose={() => setShowOrdersModal(false)} />
    </>
  );
}