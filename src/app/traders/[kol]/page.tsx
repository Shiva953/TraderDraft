"use client";

import React, { useEffect, useRef, useState } from "react";
import { init, resume } from "@jup-ag/terminal";
import TradingViewChart from "@/components/TradingViewChart";

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

export default function TraderPage({ params }: TraderPageProps) {
  const [isTerminalLoaded, setIsTerminalLoaded] = useState(false);
  const [kolData, setKolData] = useState<KOLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

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
        setKolData(data.data);
      } catch (err) {
        console.error('Error fetching KOL data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch KOL data');
      } finally {
        setLoading(false);
      }
    };

    fetchKOLData();
  }, [params]);

  // Get the most recent data (prefer daily, then weekly, then monthly)
  const getCurrentData = () => {
    if (!kolData) return null;
    return kolData.daily || kolData.weekly || kolData.monthly;
  };

  const currentData = getCurrentData();

  useEffect(() => {
    const initializeTerminal = async () => {
      if (!terminalRef.current || isTerminalLoaded || !currentData?.tokenMintAddress) return;

      try {
        await init({
          displayMode: "integrated",
          integratedTargetId: "jupiter-terminal",
          formProps: {
            initialAmount: "1000000",
            initialInputMint: "So11111111111111111111111111111111111111112", // SOL mint
            initialOutputMint: currentData.tokenMintAddress,
            fixedAmount: false,
            swapMode: "ExactIn",
          },
          enableWalletPassthrough: true,
          onSuccess: ({ txid }) => {
            console.log("Swap successful:", txid);
          },
          onSwapError: ({ error }) => {
            console.error("Swap failed:", error);
          },
          defaultExplorer: "Solscan",
          containerStyles: {
            maxHeight: "90vh",
          },
          containerClassName: "jupiter-terminal-container",
        });

        setIsTerminalLoaded(true);
      } catch (error) {
        console.error("Failed to initialize Jupiter Terminal:", error);
      }
    };

    initializeTerminal();
  }, [currentData?.tokenMintAddress, isTerminalLoaded]);

  const openTerminal = () => {
    resume();
  };

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto py-10 px-4">
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
      <main className="max-w-6xl mx-auto py-10 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 text-red-400">Error</h1>
          <p className="text-neutral-400">{error || 'No data found for this trader'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto py-10 px-4">
      {/* Top Section - Trader Overview */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            {currentData.avatarUrl && (
              <img 
                src={currentData.avatarUrl} 
                alt={currentData.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{currentData.name}</h1>
              <div className="flex items-center space-x-4">
                <span className="text-green-400 text-lg">
                  +{currentData.pnl} SOL this week
                </span>
                {currentData.xUrl && (
                  <a 
                    href={currentData.xUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    @{currentData.name}
                  </a>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-4xl font-bold text-white mb-2">
              {currentData.tokenPrice ? `$${currentData.tokenPrice}` : 'N/A'}
            </div>
            <div className="flex items-center space-x-2">
              {currentData.priceChange24hPercent && currentData.priceChange24hPercent > 0 ? (
                <span className="text-green-400">↗ {currentData.priceChange24hPercent.toFixed(2)}%</span>
              ) : currentData.priceChange24hPercent ? (
                <span className="text-red-400">↘ {currentData.priceChange24hPercent.toFixed(2)}%</span>
              ) : (
                <span className="text-neutral-400">No price data</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white font-medium transition-colors">
            Buy
          </button>
          <button className="px-6 py-3 border border-white text-white hover:bg-white hover:text-black rounded-lg font-medium transition-colors">
            Sell
          </button>
        </div>
      </div>

      {/* Chart and Trading Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-neutral-900/80 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {currentData.name}/SOL
              </h2>
            </div>
            {/* TradingView Chart */}
            <TradingViewChart 
              tokenSymbol={currentData.name}
              tokenMint={currentData.tokenMintAddress}
            />
          </div>
        </div>

        {/* Jupiter Terminal Section */}
        <div className="lg:col-span-1">
          <div className="rounded-lg bg-neutral-900/80 p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Swap</h2>
            
            {/* Jupiter Terminal Container */}
            <div 
              id="jupiter-terminal" 
              ref={terminalRef}
              className="jupiter-terminal-container"
            />
            
            {!isTerminalLoaded && (
              <div className="h-96 bg-neutral-800/50 rounded-lg flex items-center justify-center">
                <p className="text-neutral-500">Loading trading terminal...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg bg-neutral-900/80 p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-neutral-400">Rank:</span>
              <span className="text-white font-mono">#{currentData.rank}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Win Rate:</span>
              <span className="text-yellow-400">{currentData.winRate?.toFixed(1) || 'N/A'}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Period:</span>
              <span className="text-white capitalize">{currentData.period.toLowerCase()}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-neutral-900/80 p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Token Info</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-neutral-400">Price:</span>
              <span className="text-white font-mono">
                {currentData.tokenPrice ? `$${currentData.tokenPrice}` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">24h Change:</span>
              <span className={currentData.priceChange24hPercent && currentData.priceChange24hPercent > 0 ? 'text-green-400' : 'text-red-400'}>
                {currentData.priceChange24hPercent ? `${currentData.priceChange24hPercent.toFixed(2)}%` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Pool Address:</span>
              <span className="text-white font-mono text-xs">
                {currentData.poolAddress ? `${currentData.poolAddress.slice(0, 8)}...${currentData.poolAddress.slice(-8)}` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-neutral-900/80 p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4">All Periods</h3>
          <div className="space-y-3">
            {kolData?.daily && (
              <div className="flex justify-between">
                <span className="text-neutral-400">Daily PNL:</span>
                <span className="text-white">{kolData.daily.pnl} SOL</span>
              </div>
            )}
            {kolData?.weekly && (
              <div className="flex justify-between">
                <span className="text-neutral-400">Weekly PNL:</span>
                <span className="text-white">{kolData.weekly.pnl} SOL</span>
              </div>
            )}
            {kolData?.monthly && (
              <div className="flex justify-between">
                <span className="text-neutral-400">Monthly PNL:</span>
                <span className="text-white">{kolData.monthly.pnl} SOL</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}