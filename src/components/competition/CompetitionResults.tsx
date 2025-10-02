'use client'

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, Award } from 'lucide-react';
import { useSolanaWallets } from "@privy-io/react-auth";

interface CompetitionResult {
  rank: number;
  userId: number;
  userWallet: string;
  windowScore: string;
  tournamentPoints: string;
  leaderboardPoints: string;
  userTotalTP: string;
}

interface CompetitionResultsProps {
  competitionId: string;
}

export function CompetitionResults({ competitionId }: CompetitionResultsProps) {
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useSolanaWallets();

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const userWallet = embeddedWallet?.address;

  useEffect(() => {
    fetchResults();
  }, [competitionId]);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/competitions/${competitionId}/finalize`);

      if (!response.ok) {
        throw new Error('Failed to fetch competition results');
      }

      const data = await response.json();

      if (data.success && data.results) {
        setResults(data.results);
      } else {
        setError('No results available');
      }
    } catch (err) {
      console.error('Error fetching competition results:', err);
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const getUserResult = () => {
    if (!userWallet) return null;
    return results.find(r => r.userWallet.toLowerCase() === userWallet.toLowerCase());
  };

  const userResult = getUserResult();

  if (loading) {
    return (
      <Card className="relative overflow-hidden border-neutral-800 bg-neutral-900/40 backdrop-blur-sm">
        <div className="flex flex-col gap-6 p-8 md:p-12">
          <Skeleton className="h-8 w-64 bg-neutral-800" />
          <Skeleton className="h-24 w-full bg-neutral-800" />
          <Skeleton className="h-64 w-full bg-neutral-800" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="relative overflow-hidden border-red-800 bg-red-900/20 backdrop-blur-sm">
        <div className="p-8 text-center">
          <p className="text-red-400">Error: {error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-neutral-800 bg-neutral-900/40 backdrop-blur-sm">
      <div className="flex flex-col gap-6 p-8 md:p-12">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="border-purple-500/50 bg-purple-500/10 text-purple-400 px-3 py-1">
            <div className="mr-2 h-2 w-2 rounded-full bg-purple-500"></div>
            COMPETITION ENDED
          </Badge>
        </div>

        {/* Main Content */}
        <div className="flex flex-col gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                Competition Results
              </h2>
            </div>
            <p className="text-md text-neutral-400 max-w-2xl leading-relaxed">
              The competition has ended! Check out the final standings and Tournament Points distribution.
            </p>
          </div>

          {/* User's Result Highlight */}
          {userResult && (
            <Card className="border-emerald-500/50 bg-emerald-500/10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-400 mb-1">Your Final Rank</p>
                  <div className="flex items-center gap-4">
                    <span className="text-4xl font-bold text-white">#{userResult.rank}</span>
                    <div className="text-left">
                      <p className="text-sm text-neutral-400">Tournament Points Earned</p>
                      <p className="text-2xl font-bold text-emerald-400">+{parseFloat(userResult.tournamentPoints).toFixed(2)} TP</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-neutral-400">Total TP</p>
                  <p className="text-3xl font-bold text-white">{parseFloat(userResult.userTotalTP).toFixed(2)}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-4">
            {results.slice(0, 3).map((result, index) => {
              const isUser = userWallet && result.userWallet.toLowerCase() === userWallet.toLowerCase();
              return (
                <Card
                  key={result.userId}
                  className={`p-6 text-center ${
                    index === 0
                      ? 'border-yellow-500/50 bg-yellow-500/10'
                      : index === 1
                      ? 'border-gray-400/50 bg-gray-400/10'
                      : 'border-orange-600/50 bg-orange-600/10'
                  } ${isUser ? 'ring-2 ring-emerald-500' : ''}`}
                >
                  <div className="flex flex-col items-center gap-2">
                    {index === 0 && <Trophy className="w-12 h-12 text-yellow-500" />}
                    {index === 1 && <Medal className="w-12 h-12 text-gray-400" />}
                    {index === 2 && <Award className="w-12 h-12 text-orange-600" />}
                    <div className="text-3xl font-bold text-white">#{result.rank}</div>
                    <div className="font-mono text-xs text-neutral-400">
                      {result.userWallet.substring(0, 6)}...{result.userWallet.substring(result.userWallet.length - 4)}
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-neutral-500">Tournament Points</p>
                      <p className="text-xl font-bold text-emerald-400">
                        {parseFloat(result.tournamentPoints).toFixed(2)}
                      </p>
                    </div>
                    <div className="mt-1">
                      <p className="text-xs text-neutral-500">Window Score</p>
                      <p className="text-lg font-semibold text-white">
                        {parseFloat(result.windowScore).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Full Leaderboard */}
          {results.length > 3 && (
            <Card className="border-neutral-700 bg-neutral-800/50 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Full Leaderboard</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-[60px_1fr_120px_120px] gap-4 px-4 pb-2 text-xs uppercase tracking-wider text-neutral-400 border-b border-neutral-700 sticky top-0 bg-neutral-800/50">
                  <div>Rank</div>
                  <div>Wallet</div>
                  <div className="text-right">Window Score</div>
                  <div className="text-right">TP Earned</div>
                </div>
                {results.map((result) => {
                  const isUser = userWallet && result.userWallet.toLowerCase() === userWallet.toLowerCase();
                  return (
                    <div
                      key={result.userId}
                      className={`grid grid-cols-[60px_1fr_120px_120px] gap-4 items-center px-4 py-3 rounded-lg ${
                        isUser ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-neutral-900/50 hover:bg-neutral-900'
                      } transition-colors`}
                    >
                      <div className="font-bold text-white">#{result.rank}</div>
                      <div className="font-mono text-sm text-neutral-200">
                        {result.userWallet.substring(0, 6)}...{result.userWallet.substring(result.userWallet.length - 4)}
                      </div>
                      <div className="text-right text-neutral-300">
                        {parseFloat(result.windowScore).toFixed(2)}
                      </div>
                      <div className="text-right font-semibold text-emerald-400">
                        +{parseFloat(result.tournamentPoints).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none"></div>
    </Card>
  );
}
