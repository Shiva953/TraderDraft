'use client';

import { useState, useEffect } from 'react';
import { useSolanaWallets } from '@privy-io/react-auth';

interface UserPackData {
  packHoldings: number;
  totalValueOfPackHoldings: number;
  claimedPacks: number;
  unclaimedPacks: number;
}

export default function UserPacks() {
  const [packData, setPackData] = useState<UserPackData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useSolanaWallets();

  const fetchUserPacks = async () => {
    if (!wallets || wallets.length === 0) return;

    const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
    if (!embeddedWallet) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/getUserPacks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrivyWalletAddress: embeddedWallet.address,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setPackData(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch user packs');
      }
    } catch (err) {
      console.error('Error fetching user packs:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (wallets && wallets.length > 0) {
      fetchUserPacks();
    }
  }, [wallets]);

  if (!wallets || wallets.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Your Packs</h3>
        <button
          onClick={fetchUserPacks}
          disabled={isLoading}
          className="text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/20 border border-red-800 p-3 text-sm text-red-400">
          <strong>Error:</strong> {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      ) : packData ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-neutral-700 p-4 bg-neutral-800/50">
            <div className="text-sm text-neutral-400 mb-1">Total Packs</div>
            <div className="text-2xl font-bold text-white">{packData.packHoldings || 0}</div>
          </div>
          
          <div className="rounded-lg border border-neutral-700 p-4 bg-neutral-800/50">
            <div className="text-sm text-neutral-400 mb-1">Total Value</div>
            <div className="text-2xl font-bold text-purple-400">
              {packData.totalValueOfPackHoldings ? Number(packData.totalValueOfPackHoldings).toFixed(2) : '0.00'} SOL
            </div>
          </div>
          
          <div className="rounded-lg border border-neutral-700 p-4 bg-neutral-800/50">
            <div className="text-sm text-neutral-400 mb-1">Claimed</div>
            <div className="text-2xl font-bold text-green-400">{packData.claimedPacks || 0}</div>
          </div>
          
          <div className="rounded-lg border border-neutral-700 p-4 bg-neutral-800/50">
            <div className="text-sm text-neutral-400 mb-1">Unclaimed</div>
            <div className="text-2xl font-bold text-orange-400">{packData.unclaimedPacks || 0}</div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-neutral-400">
          <div className="mb-2">📦</div>
          <p>No packs found</p>
          <p className="text-sm">Buy some packs to get started!</p>
        </div>
      )}
    </div>
  );
}
