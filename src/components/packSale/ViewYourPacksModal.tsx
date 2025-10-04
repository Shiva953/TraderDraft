'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Package, RefreshCw } from 'lucide-react';
import { useUserPacks } from '@/app/hooks/useUserPacks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import ViewOrdersModal from './ViewOrdersModal';

interface ViewYourPacksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ViewYourPacksModal({ isOpen, onClose }: ViewYourPacksModalProps) {
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const { data: userPacks, loading, error, refresh, isConnected } = useUserPacks();

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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-pink-500" />
            <h2 className="text-2xl font-semibold text-white">Your Packs</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-800 transition-colors duration-200"
          >
            <X className="h-5 w-5 text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-140px)] p-6">
          {!isConnected ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-neutral-400">Please connect your wallet</p>
            </div>
          ) : loading || !userPacks ? (
            <div className="space-y-4">
              <div className="flex items-center justify-end gap-3 mb-4">
                <Skeleton className="h-8 w-24 bg-neutral-800" />
                <Skeleton className="h-8 w-20 bg-neutral-800" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="bg-neutral-800/50 p-4 border-neutral-700">
                    <Skeleton className="h-4 w-24 mb-2 bg-neutral-700" />
                    <Skeleton className="h-8 w-16 bg-neutral-700" />
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-end gap-3 mb-4">
                <Button
                  onClick={() => setShowOrdersModal(true)}
                  variant="outline"
                  size="sm"
                  className="border-neutral-700 hover:bg-neutral-800 text-white cursor-pointer"
                >
                  View Orders
                </Button>
                <Button
                  onClick={refresh}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="border-neutral-700 hover:bg-neutral-800 text-white cursor-pointer gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? "Refreshing..." : "Refresh"}
                </Button>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-800">
                  <AlertDescription className="text-red-400">
                    Error: {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-neutral-800/50 p-6 border-neutral-700">
                  <div className="text-sm text-neutral-400 uppercase tracking-wide font-medium mb-2">Total Packs</div>
                  <div className="text-3xl font-bold text-white">{userPacks.packHoldings}</div>
                </Card>

                <Card className="bg-neutral-800/50 p-6 border-neutral-700">
                  <div className="text-sm text-neutral-400 uppercase tracking-wide font-medium mb-2">Total Value</div>
                  <div className="text-3xl font-bold text-white">{Number(userPacks.totalValueOfPackHoldings).toFixed(2)} <span className="text-xl text-neutral-400">SOL</span></div>
                </Card>

                <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 p-6 border-pink-500/30">
                  <div className="text-sm text-pink-400 uppercase tracking-wide font-medium mb-2">Unclaimed</div>
                  <div className="text-3xl font-bold text-pink-500">{userPacks.unclaimedPacks}</div>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6 border-green-500/30">
                  <div className="text-sm text-green-400 uppercase tracking-wide font-medium mb-2">Claimed</div>
                  <div className="text-3xl font-bold text-green-500">{userPacks.claimedPacks}</div>
                </Card>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-800 bg-neutral-900/50">
          <p className="text-xs text-neutral-500 text-center">
            Your pack holdings and transaction history
          </p>
        </div>
      </div>

      {/* View Orders Modal */}
      {showOrdersModal && (
        <ViewOrdersModal isOpen={showOrdersModal} onClose={() => setShowOrdersModal(false)} />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
