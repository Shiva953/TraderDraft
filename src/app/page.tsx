'use client'

import Image from "next/image";
import { Leaderboard, type LeaderboardEntry } from "../components/Leaderboard";
import { Trending, type TrendingItem } from "../components/Trending";
import Swap from "../components/swap";
import { CreateToken } from "../components/CreateToken";
import { useRouter } from "next/router";
import {PrivyProvider, useLogin, usePrivy, useSolanaWallets, useLoginWithOAuth, useLogout} from '@privy-io/react-auth';
import { useEffect, useState } from "react";

export default function Home() {
  const leaderboardData: LeaderboardEntry[] = [
    { rank: 1, handle: "gainzy", changePct: 3.2 },
    { rank: 2, handle: "haylo", changePct: 1.1 },
    { rank: 3, handle: "zlrk69", changePct: 0.9 },
    { rank: 4, handle: "gr3g", changePct: 2.4 },
    { rank: 5, handle: "spuno", changePct: 0.7 },
  ];

  const trendingData: TrendingItem[] = [
    { name: "GAINZY", price: 0.056, deltaPct: 3.5 },
    { name: "ZELSER", price: 0.14, deltaPct: -6.2 },
    { name: "JADAWGS", price: 0.98, deltaPct: 2.7 },
  ];

  const [walletAddress, setWalletAddress] = useState('');
  const [isWalletLoading, setIsWalletLoading] = useState(true);

  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();
  const { wallets } = useSolanaWallets();
  const { logout } = useLogout();


  console.log("Current state:", { ready, authenticated, wallets: wallets.length, user });
  
  const { initOAuth, loading } = useLoginWithOAuth({
    onError: (err) => console.error('OAuth login failed:', err),
    onComplete: ({ user, loginMethod }) => {
      console.log(`Logged in via ${loginMethod}`, user);
      // Reset wallet loading state when login completes
      setIsWalletLoading(true);
    },
  });

  // Enhanced wallet detection with retry logic
  useEffect(() => {
    if (!ready || !authenticated) {
      setWalletAddress('');
      setIsWalletLoading(false);
      return;
    }

    const findWallet = () => {
      console.log("Looking for wallets...", wallets);
      
      // Look for Solana embedded wallet specifically
      const embeddedWallet = wallets.find(
        (w) => w.walletClientType === 'privy'
      );

      if (embeddedWallet) {
        console.log('Found embedded wallet:', embeddedWallet);
        setWalletAddress(embeddedWallet.address.substring(0, 6));
        setIsWalletLoading(false);
        return true;
      }
      return false;
    };

    // Try to find wallet immediately
    if (findWallet()) {
      return;
    }

    // If no wallet found, set up polling with timeout
    const maxRetries = 10;
    let retryCount = 0;

    const pollForWallet = setInterval(() => {
      retryCount++;
      console.log(`Polling for wallet... attempt ${retryCount}`);
      
      if (findWallet() || retryCount >= maxRetries) {
        clearInterval(pollForWallet);
        if (retryCount >= maxRetries) {
          console.log('Max retries reached, no wallet found');
          setIsWalletLoading(false);
        }
      }
    }, 1000); // Poll every second

    return () => clearInterval(pollForWallet);
  }, [ready, authenticated, wallets]);


  if (!authenticated) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Welcome to Kolscan</h1>
          </div>

          <button
              disabled={loading}
              onClick={() => login()}
              className="group relative flex mx-auto items-center justify-center gap-3 rounded-full px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg shadow-rose-500/30 transition-all duration-200 hover:shadow-rose-500/50 focus:outline-none focus:ring-4 focus:ring-rose-400/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <span>Login With Privy</span>
            </button>

          {/* <div className="grid gap-3">
            <button
              disabled={loading}
              onClick={() => initOAuth({ provider: 'google' })}
              className="group relative flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-rose-500/10 to-transparent px-4 py-3 text-sm font-medium text-white transition-all duration-200 hover:border-white/20 hover:from-rose-500/20 focus:outline-none focus:ring-2 focus:ring-rose-400/40 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <span>Continue with Google</span>
            </button>

            <button
              disabled={loading}
              onClick={() => initOAuth({ provider: 'github' })}
              className="group relative flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/10 to-transparent px-4 py-3 text-sm font-medium text-white transition-all duration-200 hover:border-white/20 hover:from-violet-500/20 focus:outline-none focus:ring-2 focus:ring-violet-400/40 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <span>Continue with GitHub</span>
            </button>

            <button
              disabled={loading}
              onClick={() => initOAuth({ provider: 'twitter' })}
              className="group relative flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-sky-500/10 to-transparent px-4 py-3 text-sm font-medium text-white transition-all duration-200 hover:border-white/20 hover:from-sky-500/20 focus:outline-none focus:ring-2 focus:ring-sky-400/40 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <span>Continue with Twitter</span>
            </button>
          </div> */}
        </div>
      </main>
    );
  }
  
  if (!ready) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <button className="rounded-lg bg-rose-300 px-4 py-2 text-sm font-semibold text-neutral-900">EXPLORE PACKS</button>
        <div className="flex items-center gap-3">
          <button className="rounded-full border border-white/20 px-4 py-2 text-sm text-white">
            {isWalletLoading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                Loading...
              </span>
            ) : walletAddress || 'No Wallet'}
          </button>
          <button onClick={logout} className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-white/40 hover:bg-white/5 transition-all duration-200 cursor-pointer">
            Log Out
          </button>
          <div className="h-9 w-9 overflow-hidden rounded-full ring-1 ring-white/20">
            <div className="h-full w-full bg-neutral-700" />
          </div>
        </div>
      </div>

      <header className="text-center">
        <h1 className="text-4xl font-semibold text-neutral-100">Kolscan</h1>
      </header>

      <div className="rounded-2xl border border-neutral-800 p-4">
        <Leaderboard title="Top Traders This Week" entries={leaderboardData} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Trending items={trendingData} />
        <Swap />
      </div>

      <CreateToken />
    </main>
  );
}
