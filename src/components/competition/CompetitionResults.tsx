'use client'

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Trophy, Medal, Award } from 'lucide-react';
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { PackOpeningModal } from './PackOpeningModal';

// Date formatting utility
const formatCompetitionDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

const formatCompetitionDuration = (startDate: Date, endDate: Date) => {
  return `${formatCompetitionDate(startDate)} - ${formatCompetitionDate(endDate)}`;
};

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
  nextCompetitionStart?: Date | null;
  competitionStartDate?: Date;
  competitionEndDate?: Date;
}

export function CompetitionResults({
  competitionId,
  nextCompetitionStart,
  competitionStartDate,
  competitionEndDate
}: CompetitionResultsProps) {
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTPModal, setShowTPModal] = useState(false);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [showPackModal, setShowPackModal] = useState(false);
  const { wallets } = useSolanaWallets();

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const userWallet = embeddedWallet?.address;

  useEffect(() => {
    // Fetch results when competition ID changes (only happens on page load now)
    fetchResults();
  }, [competitionId]);

  const fetchResults = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;

    setLoading(true);
    setError(null);

    try {
      console.log(`🔄 [CompetitionResults] Fetching results (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);

      const response = await fetch(`/api/competitions/${competitionId}/finalize`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Handle both 'results' (old) and 'leaderboard' (new) response formats
        const leaderboard = data.results || data.leaderboard || [];
        setResults(leaderboard);

        // If no participants, show empty state
        if (leaderboard.length === 0) {
          console.log('ℹ️ [CompetitionResults] No participants in this competition');
        } else {
          console.log(`✅ [CompetitionResults] Loaded ${leaderboard.length} results`);
        }
      } else {
        throw new Error('No results available');
      }

      setLoading(false);
      setError(null);
    } catch (err) {
      console.error(`❌ [CompetitionResults] Error (attempt ${retryCount + 1}):`, err);

      // Retry logic
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 [CompetitionResults] Retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchResults(retryCount + 1);
      } else {
        console.error('❌ [CompetitionResults] Max retries reached');
        setError(err instanceof Error ? err.message : 'Failed to load results');
        setLoading(false);
      }
    }
  };

  const getUserResult = () => {
    if (!userWallet) return null;
    return results.find(r => r.userWallet.toLowerCase() === userWallet.toLowerCase());
  };

  const userResult = getUserResult();

  const getTimeUntilNextCompetition = () => {
    if (!nextCompetitionStart) return null;

    const now = new Date().getTime();
    const start = new Date(nextCompetitionStart).getTime();
    const distance = start - now;

    if (distance < 0) return null;

    const hours = Math.floor(distance / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes };
  };

  const timeUntilNext = getTimeUntilNextCompetition();

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
        <div className="p-8 text-center space-y-4">
          <p className="text-red-400">Error loading results: {error}</p>
          <Button
            onClick={() => fetchResults(0)}
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="relative overflow-hidden border-neutral-800 bg-gradient-to-br from-teal-500/10 via-neutral-900/40 to-cyan-500/10 backdrop-blur-sm">
        <div className="flex flex-col gap-6 p-8 md:p-12">
          {/* Main Header */}
          <div className="text-center">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-2">
              Results are Live
            </h2>

            {/* Competition Duration */}
            {competitionStartDate && competitionEndDate && (
              <p className="text-neutral-400 text-lg font-mono tracking-wide mb-6">
                {formatCompetitionDuration(competitionStartDate, competitionEndDate)}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-center mt-6">
              <Button
                onClick={() => setShowRevealModal(true)}
                size="lg"
                className="bg-black hover:bg-black text-white font-semibold cursor-pointer px-8"
              >
                Reveal Winners
              </Button>
              <Button
                onClick={() => setShowTPModal(true)}
                size="lg"
                className="bg-white text-black hover:bg-neutral-200 font-semibold cursor-pointer px-8"
              >
                View Your Points
              </Button>
              <Button
                onClick={() => setShowPackModal(true)}
                size="lg"
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10 font-semibold cursor-pointer px-8"
              >
                Open Your Packs
              </Button>
            </div>

            {/* Next Competition Timer */}
            {timeUntilNext && (
              <p className="mt-6 text-lg text-neutral-300 font-mono tracking-wider">
                NEXT COMPETITION STARTS IN {timeUntilNext.hours}H {timeUntilNext.minutes}M
              </p>
            )}
          </div>

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

        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-cyan-500/5 pointer-events-none"></div>
      </Card>

      {/* Reveal Winners Modal */}
      <Dialog open={showRevealModal} onOpenChange={setShowRevealModal}>
        <DialogContent className="bg-black border-neutral-800 max-w-md font-mono">
          <div className="flex flex-col items-center py-8 px-4">
            {/* Trophy Icon */}
            <div className="mb-6 animate-bounce">
              <Trophy className="h-16 w-16 text-purple-400" />
            </div>

            {/* Tournament Title */}
            <h2 className="text-2xl font-bold text-white mb-2">Competition Results</h2>
            {competitionStartDate && competitionEndDate && (
              <p className="text-neutral-400 text-sm mb-8">
                {formatCompetitionDuration(competitionStartDate, competitionEndDate)}
              </p>
            )}

            {/* Your Winnings */}
            {userResult ? (
              <div className="w-full mb-8">
                <p className="text-center text-neutral-400 text-sm uppercase tracking-wider mb-4">
                  YOUR WINNINGS
                </p>
                <Card className="bg-neutral-900 border-neutral-700 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white rounded-full p-2">
                        <span className="text-black font-bold text-sm">TP</span>
                      </div>
                      <span className="text-neutral-400 text-sm uppercase">Tournament Points</span>
                    </div>
                    <span className="text-white text-3xl font-bold animate-pulse">
                      {parseFloat(userResult.tournamentPoints).toFixed(0)}
                    </span>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="w-full mb-8">
                <Card className="bg-neutral-900 border-neutral-700 p-6 text-center">
                  <p className="text-neutral-500">You didn't participate in this competition</p>
                </Card>
              </div>
            )}

            {/* Top 3 Players */}
            <div className="w-full">
              <p className="text-neutral-400 text-xs uppercase tracking-wider mb-3">
                PLAYER RANK
              </p>
              <div className="space-y-2">
                {results.slice(0, 3).map((result, index) => {
                  const isUser = userWallet && result.userWallet.toLowerCase() === userWallet.toLowerCase();
                  return (
                    <Card
                      key={result.userId}
                      className={`border-neutral-800 p-4 transition-all hover:bg-neutral-800/50 ${
                        isUser ? 'ring-2 ring-emerald-500' : ''
                      }`}
                      style={{
                        backgroundColor: index === 0 ? '#1a1a1a' : index === 1 ? '#151515' : '#121212'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        {/* Rank and Wallet */}
                        <div className="flex items-center gap-4">
                          <div className="text-2xl font-bold text-white min-w-[40px]">
                            {String(index + 1).padStart(2, '0')}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white text-sm">
                              {result.userWallet.substring(0, 6)}...{result.userWallet.substring(result.userWallet.length - 4)}
                            </span>
                            <span className="text-neutral-500 text-xs">
                              {parseFloat(result.windowScore).toFixed(0)}k
                            </span>
                          </div>
                        </div>

                        {/* TP and Score */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-neutral-500">TP</span>
                              <span className="text-white font-bold">
                                {parseFloat(result.tournamentPoints).toFixed(0)}
                              </span>
                            </div>
                          </div>
                          <span className="text-emerald-400 font-bold text-lg">
                            {parseFloat(result.windowScore).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Your Points Modal */}
      <Dialog open={showTPModal} onOpenChange={setShowTPModal}>
        <DialogContent className="bg-black border-none max-w-lg p-0 overflow-hidden font-mono">
          <div className="flex flex-col items-center justify-center min-h-[400px] py-12 px-8">
            {/* Animated TP Display */}
            {userResult ? (
              <>
                <h2 className="text-white text-xl mb-8 animate-fade-in">
                  You Earned
                </h2>
                <div className="text-emerald-400 text-8xl font-bold mb-2 animate-scale-in">
                  {parseFloat(userResult.tournamentPoints).toFixed(0)}
                </div>
                <p className="text-white text-2xl mb-12 animate-fade-in-delay">
                  Tournament Points
                </p>
                <Button
                  onClick={() => setShowTPModal(false)}
                  size="lg"
                  className="cursor-pointer bg-[#EF7DB4] hover:bg-[#CA6897] text-white px-12 py-6 rounded-full text-lg"
                >
                  See Leaderboard
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-white text-xl mb-8">
                  You Earned
                </h2>
                <div className="text-neutral-500 text-8xl font-bold mb-2 tracking-tighter">
                  0
                </div>
                <p className="text-neutral-400 text-2xl mb-12">
                Tournament Points
                </p>
                <p className="text-neutral-500 text-sm">You didn't participate in this competition</p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Legacy TP Modal (Old Design - Can be removed) */}
      <Dialog open={false}>
        <DialogContent className="bg-neutral-900 border-neutral-800 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Tournament {competitionStartDate && competitionEndDate && `(${formatCompetitionDuration(competitionStartDate, competitionEndDate)})`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* User's Performance */}
            {userResult ? (
              <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-emerald-400 mb-1">Your Final Rank</p>
                    <span className="text-4xl font-bold text-white">#{userResult.rank}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-neutral-400 mb-1">TP Earned</p>
                    <p className="text-3xl font-bold text-emerald-400">+{parseFloat(userResult.tournamentPoints).toFixed(2)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-500/30">
                  <div>
                    <p className="text-xs text-neutral-400">Window Score</p>
                    <p className="text-lg font-semibold text-white">{parseFloat(userResult.windowScore).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400">Total TP (All Time)</p>
                    <p className="text-lg font-semibold text-white">{parseFloat(userResult.userTotalTP).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-6">
                <div className="flex items-center justify-center gap-3">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-neutral-500 mb-2">0</p>
                    <p className="text-sm text-neutral-400">You didn't participate</p>
                  </div>
                </div>
              </div>
            )}

            {/* Top 3 */}
            {results.length > 0 ? (
              <div>
                <h3 className="text-lg font-bold text-white mb-3">Top 3 Winners</h3>
                <div className="space-y-2">
                  {results.slice(0, 3).map((result, index) => {
                  const isUser = userWallet && result.userWallet.toLowerCase() === userWallet.toLowerCase();
                  return (
                    <div
                      key={result.userId}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        index === 0
                          ? 'bg-yellow-500/10 border border-yellow-500/50'
                          : index === 1
                          ? 'bg-gray-400/10 border border-gray-400/50'
                          : 'bg-orange-600/10 border border-orange-600/50'
                      } ${isUser ? 'ring-2 ring-emerald-500' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        {index === 0 && <Trophy className="w-6 h-6 text-yellow-500" />}
                        {index === 1 && <Medal className="w-6 h-6 text-gray-400" />}
                        {index === 2 && <Award className="w-6 h-6 text-orange-600" />}
                        <div>
                          <div className="font-mono text-sm text-white">
                            {result.userWallet.substring(0, 8)}...{result.userWallet.substring(result.userWallet.length - 4)}
                          </div>
                          <div className="text-xs text-neutral-400">
                            Score: {parseFloat(result.windowScore).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-400">
                          {parseFloat(result.tournamentPoints).toFixed(2)} TP
                        </p>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            ) : (
              <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-6 text-center">
                <p className="text-neutral-400">No participants in this competition</p>
              </div>
            )}

            {/* Full Leaderboard */}
            {results.length > 3 && (
              <div>
                <h3 className="text-lg font-bold text-white mb-3">All Participants</h3>
                <div className="border border-neutral-700 rounded-lg overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-[60px_1fr_100px] gap-4 px-4 py-2 text-xs uppercase tracking-wider text-neutral-400 border-b border-neutral-700 bg-neutral-800 sticky top-0">
                      <div>Rank</div>
                      <div>Wallet</div>
                      <div className="text-right">TP</div>
                    </div>
                    {results.map((result) => {
                      const isUser = userWallet && result.userWallet.toLowerCase() === userWallet.toLowerCase();
                      return (
                        <div
                          key={result.userId}
                          className={`grid grid-cols-[60px_1fr_100px] gap-4 items-center px-4 py-3 border-b border-neutral-800 ${
                            isUser ? 'bg-emerald-500/20' : 'hover:bg-neutral-800/50'
                          }`}
                        >
                          <div className="font-bold text-white">#{result.rank}</div>
                          <div className="font-mono text-sm text-neutral-200 truncate">
                            {result.userWallet.substring(0, 6)}...{result.userWallet.substring(result.userWallet.length - 4)}
                          </div>
                          <div className="text-right font-semibold text-emerald-400">
                            {parseFloat(result.tournamentPoints).toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pack Opening Modal */}
      <PackOpeningModal
        isOpen={showPackModal}
        onClose={() => setShowPackModal(false)}
        userTP={userResult ? parseFloat(userResult.userTotalTP) : 0}
      />
    </>
  );
}
