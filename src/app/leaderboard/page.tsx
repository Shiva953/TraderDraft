'use client'

import { PointsLeaderboard } from '@/components/competition/PointsLeaderboard';
import { useWallet } from '@/app/hooks/useWallet';
import { useLogin } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';

export default function LeaderboardPage() {
  const { isLoading: isWalletLoading, isConnected: authenticated } = useWallet();
  const { login } = useLogin();

  // Show loading state while checking authentication
  if (isWalletLoading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center" style={{ backgroundColor: '#0F0F0F' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!authenticated) {
    return (
      <main className="min-h-screen text-white flex items-center justify-center p-4" style={{ backgroundColor: '#0F0F0F' }}>
        <div className="w-full max-w-md space-y-8 text-center">
          {/* Logo or icon area */}
          <div className="space-y-3">
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500 bg-clip-text text-transparent animate-fade-in">
              Kolscan
            </h1>
            <p className="text-neutral-400 text-lg">
              Please log in to view the leaderboard
            </p>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => login()}
              size="lg"
              className="cursor-pointer w-full sm:w-auto px-8 py-6 text-base font-semibold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-[0_0_30px_rgba(236,72,153,0.3)] hover:shadow-[0_0_40px_rgba(236,72,153,0.5)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              Login With Privy
            </Button>
          </div>

          {/* Optional: Add a subtle footer text */}
          <p className="text-neutral-500 text-sm pt-8">
            Secure authentication powered by Privy
          </p>
        </div>
      </main>
    );
  }

  // Render leaderboard for authenticated users
  return (
    <main className="min-h-screen text-white">
      {/* Center-focused container with max width and responsive padding */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <PointsLeaderboard />
      </div>
    </main>
  );
}
