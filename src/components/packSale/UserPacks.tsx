import React, { useState } from 'react';
import { useUserPacks } from '@/app/hooks/useUserPacks';
import ViewOrdersModal from './ViewOrdersModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserPacks() {
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const { data: userPacks, loading, error, refresh, isConnected } = useUserPacks();

  // Don't render if not connected
  if (!isConnected) return null;

  // Show loading skeleton on initial load
  if (loading && !userPacks) {
    return (
      <Card className="bg-gray-200 p-6 font-mono border-gray-300">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-32 bg-gray-300" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-24 bg-gray-300" />
            <Skeleton className="h-8 w-20 bg-gray-300" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-gray-300 p-4 border-gray-400">
              <Skeleton className="h-4 w-24 mb-2 bg-gray-400" />
              <Skeleton className="h-8 w-16 bg-gray-400" />
            </Card>
          ))}
        </div>
      </Card>
    );
  }

  // Don't render if no pack data after loading
  if (!userPacks) return null;

  return (
    <>
      <Card className="bg-gray-200 p-6 font-mono border-gray-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-light text-gray-600 uppercase tracking-wide">Your Packs</h3>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowOrdersModal(true)}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-black cursor-pointer"
            >
              View Orders
            </Button>
            <Button
              onClick={refresh}
              disabled={loading}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-black cursor-pointer"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4 bg-red-100 border-red-300">
            <AlertDescription className="text-red-700">
              Error: {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gray-300 p-4 border-gray-400">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-light mb-1">Total Packs</div>
            <div className="text-2xl font-light text-black">{userPacks.packHoldings}</div>
          </Card>

          <Card className="bg-gray-300 p-4 border-gray-400">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-light mb-1">Total Value</div>
            <div className="text-2xl font-light text-black">{userPacks.totalValueOfPackHoldings} SOL</div>
          </Card>

          <Card className="bg-gray-300 p-4 border-gray-400">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-light mb-1">Unclaimed</div>
            <div className="text-2xl font-light text-black">{userPacks.unclaimedPacks}</div>
          </Card>

          <Card className="bg-gray-300 p-4 border-gray-400">
            <div className="text-sm text-gray-600 uppercase tracking-wide font-light mb-1">Claimed</div>
            <div className="text-2xl font-light text-black">{userPacks.claimedPacks}</div>
          </Card>
        </div>
      </Card>

      <ViewOrdersModal isOpen={showOrdersModal} onClose={() => setShowOrdersModal(false)} />
    </>
  );
}