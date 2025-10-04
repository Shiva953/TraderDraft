'use client'

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useLogin, useLogout } from '@privy-io/react-auth';
import UserProfilePicture from '@/components/profile/UserProfilePicture';
import { PackOpeningModal } from '@/components/competition/PackOpeningModal';
import { useWallet } from '@/app/hooks/useWallet';
import { useUserPacks } from '@/app/hooks/useUserPacks';
import { useUserData } from '@/app/hooks/useUserData';
import { Home, Trophy, TrendingUp } from 'lucide-react';

export function Navigation() {
  const [showPackOpeningModal, setShowPackOpeningModal] = useState(false);
  const [userTP, setUserTP] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useLogout();

  const {
    address: walletAddress,
    fullAddress: fullWalletAddress,
    isLoading: isWalletLoading,
    isConnected: authenticated
  } = useWallet();

  const {
    data: userPacksData,
  } = useUserPacks();

  const {
    packs: userPacks,
    tokenHoldings,
    tokenHoldingsCount,
    loading: userDataLoading,
    error: userDataError,
  } = useUserData(authenticated);

  // Fetch user TP when wallet is connected
  useEffect(() => {
    if (fullWalletAddress) {
      fetchUserTP();
    }
  }, [fullWalletAddress]);

  const fetchUserTP = async () => {
    if (!fullWalletAddress) return;
    try {
      const response = await fetch(`/api/getUserTotalTP?userWallet=${encodeURIComponent(fullWalletAddress)}`);
      if (response.ok) {
        const data = await response.json();
        setUserTP(data.totalTP || 0);
      }
    } catch (err) {
      console.error('Error fetching total TP:', err);
    }
  };

  // Don't show navigation if not authenticated
  if (!authenticated) {
    return null;
  }

  return (
    <>
      <nav className="border-b border-neutral-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left side - Action buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {/* TODO: Open buy packs with TP modal */}}
                className="bg-white text-black font-semibold hover:bg-neutral-200 cursor-pointer"
              >
                Buy Packs With TP
              </Button>
              <Button
                onClick={() => setShowPackOpeningModal(true)}
                variant="outline"
                className="border-neutral-700 hover:bg-neutral-800 text-white font-semibold cursor-pointer"
              >
                Open Your Packs
              </Button>
            </div>

            {/* Center - Navigation Links */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => router.push('/')}
                variant="ghost"
                className={`gap-2 ${pathname === '/' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
              <Button
                onClick={() => router.push('/kols')}
                variant="ghost"
                className={`cursor-pointer gap-2 ${pathname === '/kols' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}
              >
                <TrendingUp className="h-4 w-4" />
                KOLs
              </Button>
              <Button
                onClick={() => router.push('/leaderboard')}
                variant="ghost"
                className={`cursor-pointer gap-2 ${pathname === '/leaderboard' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}
              >
                <Trophy className="h-4 w-4" />
                Leaderboard
              </Button>
            </div>

            {/* Right side - User profile */}
            <div className="flex items-center gap-3">
              <UserProfilePicture
                walletAddress={walletAddress}
                userPrivyWalletAddress={fullWalletAddress}
                userPacks={userPacksData}
                tokenHoldings={tokenHoldings}
                tokenHoldingsCount={tokenHoldingsCount}
                userDataLoading={userDataLoading}
                userDataError={userDataError}
                onLogout={logout}
              />
              {process.env.NODE_ENV === 'development' && (
                <Button
                  onClick={() => {/* Trigger update if needed */}}
                  variant="outline"
                  className="rounded-full border-orange-500/20 text-orange-300 hover:border-orange-500/40 hover:bg-orange-500/5"
                >
                  Trigger Update
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Pack Opening Modal */}
      <PackOpeningModal
        isOpen={showPackOpeningModal}
        onClose={() => setShowPackOpeningModal(false)}
        userTP={userTP}
      />
    </>
  );
}
