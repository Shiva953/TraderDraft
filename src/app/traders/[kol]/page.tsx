"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowDown, Users, ExternalLink } from "lucide-react";
import { useSolanaWallets } from "@privy-io/react-auth";

interface TraderPageProps {
  params: { kol: string };
}

interface TraderData {
  id: string;
  rank: number;
  name: string;
  address: string;
  pnl: string;
  winRate: number;
  avatarUrl: string;
  xUrl: string;
  tokenMintAddress: string;
  poolAddress: string;
  period: string;
  tokenPrice?: string;
  priceChange24h?: string;
  priceChange24hPercent?: number;
}

interface KOLData {
  name: string;
  daily: TraderData | null;
  weekly: TraderData | null;
  monthly: TraderData | null;
}

interface TokenHolding {
  ticker: string;
  name: string;
  balance: string;
  mintAddress: string;
  poolAddress?: string;
  tokenPrice?: string;
  priceChange24h?: string;
  priceChange24hPercent?: number;
}

export default function TraderPage({ params }: TraderPageProps) {
  const [kolData, setKOLData] = useState<KOLData | null>(null);
  const [userHoldings, setUserHoldings] = useState<TokenHolding[]>([]);
  const [userShares, setUserShares] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isJupiterReady, setIsJupiterReady] = useState(false);
  const {wallets} = useSolanaWallets()

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const userPrivyWalletAddress = embeddedWallet ? embeddedWallet.address : '9JxBhWbrwkqX2heLq1mA3YXWKsbkCH8rE5gaVxzH7Foo' 

  // Fetch KOL data
  useEffect(() => {
    const fetchKOLData = async () => {
      try {
        setLoading(true);
        const awaitedParams = await params;
        const response = await fetch('/api/getIndividualKOLData', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: awaitedParams.kol }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch KOL data');
        }

        const data = await response.json();
        setKOLData(data.data);
      } catch (err) {
        console.error('Error fetching KOL data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch KOL data');
      } finally {
        setLoading(false);
      }
    };

    fetchKOLData();
  }, [params]);

  // Fetch user's KOL token holdings
  useEffect(() => {
    const fetchUserHoldings = async () => {
      if (!userPrivyWalletAddress || userPrivyWalletAddress === "YOUR_USER_WALLET_ADDRESS") {
        console.warn("User wallet address not set");
        return;
      }

      try {
        setHoldingsLoading(true);
        const response = await fetch('/api/getUserKOLTokenHoldings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userPrivyWalletAddress }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch user holdings');
        }

        const data = await response.json();
        setUserHoldings(data.data.holdings);
      } catch (err) {
        console.error('Error fetching user holdings:', err);
      } finally {
        setHoldingsLoading(false);
      }
    };

    fetchUserHoldings();
  }, [userPrivyWalletAddress]);

  // Calculate user shares for current KOL
  useEffect(() => {
    const currentData = getCurrentData();
    if (!currentData?.tokenMintAddress || !userHoldings.length) {
      setUserShares("0");
      return;
    }

    // Find the holding that matches this KOL's token
    const kolHolding = userHoldings.find(
      holding => holding.mintAddress === currentData.tokenMintAddress
    );

    if (kolHolding) {
      // Convert from smallest unit (assuming 6 decimals for most tokens)
      // You may need to adjust this based on the actual token decimals
      const decimals = 6; // Most SPL tokens use 6 decimals
      const balance = parseInt(kolHolding.balance);
      const formattedBalance = (balance / Math.pow(10, decimals)).toLocaleString();
      setUserShares(formattedBalance);
    } else {
      setUserShares("0");
    }
  }, [userHoldings, kolData]);

  // Get the most recent data (prefer daily, then weekly, then monthly)
  const getCurrentData = () => {
    if (!kolData) return null;
    return kolData.daily || kolData.weekly || kolData.monthly;
  };

  const currentData = getCurrentData();

  // Dynamic Jupiter Terminal loading
  useEffect(() => {
    const loadJupiterTerminal = async () => {
      if (!currentData?.tokenMintAddress) return;

      try {
        console.log("Loading Jupiter Terminal dynamically...");
        
        // Load the Jupiter Terminal script dynamically
        const script = document.createElement('script');
        script.src = 'https://terminal.jup.ag/main-v2.js';
        script.onload = async () => {
          console.log("Jupiter script loaded, initializing...");
          
          // Wait for Jupiter to be available on window
          if (window.Jupiter) {
            await window.Jupiter.init({
              displayMode: "modal",
              integratedTargetId: "jupiter-terminal",
              endpoint: "https://api.devnet.solana.com",
              formProps: {
                initialInputMint: "So11111111111111111111111111111111111111112", // SOL
                initialOutputMint: currentData.tokenMintAddress,
                initialAmount: "1000000", // 1 SOL in lamports
              },
              enableWalletPassthrough: true,
              onSuccess: ({ txid }: { txid: any }) => {
                console.log("Swap successful:", txid);
                // Refresh user holdings after successful swap
                if (userPrivyWalletAddress !== "YOUR_USER_WALLET_ADDRESS") {
                  fetchUserHoldings();
                }
              },
              onSwapError: ({ error }: { error: any }) => {
                console.error("Swap error:", error);
              },
            });
            
            setIsJupiterReady(true);
            console.log("Jupiter Terminal initialized successfully");
          }
        };
        
        script.onerror = () => {
          console.error("Failed to load Jupiter Terminal script");
        };
        
        document.head.appendChild(script);

        // Cleanup function
        return () => {
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        };
      } catch (error) {
        console.error("Error setting up Jupiter Terminal:", error);
      }
    };

    loadJupiterTerminal();
  }, [currentData?.tokenMintAddress]);

  // Helper function to refresh holdings (reusable)
  const fetchUserHoldings = async () => {
    if (!userPrivyWalletAddress || userPrivyWalletAddress === "YOUR_USER_WALLET_ADDRESS") {
      return;
    }

    try {
      setHoldingsLoading(true);
      const response = await fetch('/api/getUserKOLTokenHoldings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userPrivyWalletAddress }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch user holdings');
      }

      const data = await response.json();
      setUserHoldings(data.data.holdings);
    } catch (err) {
      console.error('Error fetching user holdings:', err);
    } finally {
      setHoldingsLoading(false);
    }
  };

  const handleBuyClick = () => {
    console.log("Buy button clicked");
    if (isJupiterReady && window.Jupiter) {
      console.log("Opening Jupiter Terminal for buy...");
      window.Jupiter.open();
    } else {
      console.warn("Jupiter Terminal not ready yet");
    }
  };

  const handleSellClick = () => {
    console.log("Sell button clicked");
    if (isJupiterReady && window.Jupiter && currentData?.tokenMintAddress) {
      console.log("Opening Jupiter Terminal for sell...");
      // For sell, we need to reconfigure to swap FROM token TO SOL
      window.Jupiter.init({
        displayMode: "modal",
        formProps: {
          initialInputMint: currentData.tokenMintAddress, // Token
          initialOutputMint: "So11111111111111111111111111111111111111112", // SOL
        },
      }).then(() => {
        window.Jupiter.open();
      });
    } else {
      console.warn("Jupiter Terminal not ready yet");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-neutral-400">Loading trader data...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !currentData) {
    return (
      <main className="min-h-screen bg-black">
        <div className="text-center pt-20">
          <h1 className="text-3xl font-bold mb-4 text-red-400">Error</h1>
          <p className="text-neutral-400">{error || 'No data found for this trader'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="flex">
        {/* Left Panel */}
        <div className="w-1/2 p-8 flex flex-col justify-between">
          {/* Header with back arrow */}
          <div className="mb-12">
            <button 
              onClick={() => window.history.back()}
              className="text-white mb-8 hover:text-gray-300 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            
            {/* Trader Name and Details */}
            <div className="mb-8">
              <h1 className="text-6xl font-bold mb-4">{currentData.name}</h1>
              <a 
                href={`https://solscan.io/account/${currentData.tokenMintAddress}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-sm text-gray-400 hover:text-gray-300 transition-colors mb-2"
              >
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span>{currentData.tokenMintAddress?.slice(0, 8)}...{currentData.tokenMintAddress?.slice(-6)}</span>
                <ExternalLink size={14} />
              </a>
            </div>

            {/* Price and Change */}
            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-xs">≡</span>
                </div>
                <span className="text-5xl font-bold">
                  {'0.000062'}
                </span>
                <span className={`text-lg flex items-center ${(currentData.priceChange24hPercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  <ArrowDown className={`inline mr-1 ${(currentData.priceChange24hPercent || 0) >= 0 ? 'rotate-180' : ''}`} size={20} />
                  {Math.abs(currentData.priceChange24hPercent || 0).toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button 
                onClick={handleBuyClick}
                disabled={!isJupiterReady}
                className="cursor-pointer bg-green-500 text-white px-8 py-3 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
              >
                {isJupiterReady ? 'Buy' : 'Loading Swap...'}
              </button>
              <button 
                onClick={handleSellClick}
                disabled={!isJupiterReady}
                className="cursor-pointer bg-red-500 text-white px-8 py-3 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
              >
                {isJupiterReady ? 'Sell' : 'Loading Swap...'}
              </button>
            </div>

            {/* Status indicator */}
            <div className="mt-4">
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isJupiterReady ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`}></div>
                <span className="text-gray-400">
                  Swap: {isJupiterReady ? 'Ready' : 'Loading...'}
                </span>
              </div>
            </div>

            {/* Holdings status indicator */}
            {holdingsLoading && (
              <div className="mt-2">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                  <span className="text-gray-400">Loading holdings...</span>
                </div>
              </div>
            )}

            {/* Debug info - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 text-xs text-gray-500 space-y-1">
                <p>Jupiter Ready: {isJupiterReady ? 'Yes' : 'No'}</p>
                <p>Token: {currentData.tokenMintAddress}</p>
                <p>Jupiter Object: {typeof window !== 'undefined' && window.Jupiter ? 'Available' : 'Not Available'}</p>
                <p>User Holdings: {userHoldings.length} tokens</p>
                <p>Current KOL Holding: {userShares}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Profile and Stats */}
        <div className="w-1/2 p-8 space-y-6">
          {/* Profile Image Card */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-8 flex items-center justify-center relative h-80">
            <div className="w-64 h-64 rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src={currentData.avatarUrl || "/default-avatar.jpg"} 
                alt={currentData.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'%3E%3Crect width='256' height='256' fill='%23374151'/%3E%3Ctext x='128' y='128' text-anchor='middle' dy='0.3em' fill='%239CA3AF' font-size='64'%3E%F0%9F%91%A4%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
            
            {/* PnL in top right of profile card */}
            <div className="absolute top-6 right-6 text-right">
              <div className="mb-1">
                <span className="text-white/70 text-xs">PnL</span>
              </div>
              <div className={`text-xl font-bold ${currentData.pnl.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                {currentData.pnl.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Winrate Card */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-6">
              <div className="mb-2">
                <span className="text-white/70 text-sm">Win Rate</span>
              </div>
              <div className="text-white text-2xl font-bold">
                {currentData.winRate?.toFixed(1)}%
              </div>
            </div>

            {/* Supply Card */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-6">
              <div className="mb-2">
                <span className="text-white/70 text-sm">Active / Circ. Supply</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="text-white/60" size={16} />
                <span className="text-white text-lg font-bold">599.8k</span>
                <span className="text-white/60">/1B</span>
              </div>
            </div>
          </div>

          {/* Your Shares Card */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-6">
            <div className="mb-2">
              <span className="text-white/70 text-sm">Your Shares</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="text-white/60" size={20} />
              <span className="text-white text-2xl font-bold">
                {holdingsLoading ? (
                  <div className="animate-pulse bg-gray-600 rounded w-20 h-8"></div>
                ) : (
                  userShares
                )}
              </span>
              {userShares !== "0" && !holdingsLoading && (
                <span className="text-green-400 text-sm">tokens</span>
              )}
            </div>
            {userShares === "0" && !holdingsLoading && (
              <p className="text-white/50 text-xs mt-1">No holdings found</p>
            )}
          </div>
        </div>
      </div>

      {/* Hidden container for Jupiter Terminal */}
      <div id="jupiter-terminal" style={{ display: 'none' }} />
    </main>
  );
}

// Extend the Window interface to include Jupiter
declare global {
  interface Window {
    Jupiter: any;
  }
}