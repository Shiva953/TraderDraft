'use client'

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface KOLHolding {
  holdingId: string;
  traderId: string;
  traderName: string;
  traderTicker: string;
  traderPnl: string;
  tokenAmount: string;
  dailyScore: string;
  lastScoreUpdate: string | null;
}

interface UserDailyScore {
  userId: number;
  userWallet: string;
  totalDailyScore: number;
  holdingsCount: number;
  lastUpdated: string | null;
  holdings: KOLHolding[];
}

interface DailyScore {
  userPrivyWalletAddress: string;
  displayAddress: string;
  windowScore: number;
  tournamentPoints: number;
  rank: number;
}

interface DailyScoresModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitionId?: string;
}

export function DailyScoresModal({ open, onOpenChange, competitionId }: DailyScoresModalProps) {
  const [userScores, setUserScores] = useState<UserDailyScore[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let isMounted = true; // Prevent race conditions

    if (open && competitionId) {
      fetchDailyScores(0, isMounted);
    }

    return () => {
      isMounted = false; // Cleanup on unmount
    };
  }, [open, competitionId]);

  const toggleUserExpanded = (userId: number) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const fetchDailyScores = async (retryCount = 0, isMounted = true) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds

    if (!competitionId || !isMounted) return;

    // Keep loading state true during retries
    setLoading(true);
    setError(null);

    try {
      console.log(`🔄 [DailyScores] Fetching scores (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);

      const response = await fetch(`/api/competitions/${competitionId}/dailyUserScore`, {
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch scores`);
      }

      const data = await response.json();

      // Check if still mounted before updating state
      if (!isMounted) {
        console.log('⚠️ [DailyScores] Component unmounted, skipping state update');
        return;
      }

      if (data.success && data.userScores) {
        console.log(`📊 [DailyScores] Received ${data.userScores.length} user scores:`, data.userScores);

        // Sort by total daily score descending
        const sortedScores = data.userScores.sort((a: UserDailyScore, b: UserDailyScore) =>
          b.totalDailyScore - a.totalDailyScore
        );
        setUserScores(sortedScores);

        console.log(`📊 [DailyScores] Displaying ${sortedScores.length} sorted scores`);

        // Find the most recent lastUpdated timestamp from all users
        const mostRecentUpdate = sortedScores.reduce((latest: Date | null, score: UserDailyScore) => {
          if (score.lastUpdated) {
            const scoreDate = new Date(score.lastUpdated);
            return !latest || scoreDate > latest ? scoreDate : latest;
          }
          return latest;
        }, null);

        setLastUpdated(mostRecentUpdate);
        setError(null);
        console.log(`✅ [DailyScores] Successfully fetched ${sortedScores.length} user scores`);
      } else {
        setUserScores([]);
        setLastUpdated(null);
      }

      setLoading(false);
    } catch (err) {
      console.error(`❌ [DailyScores] Error fetching scores (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, err);

      if (!isMounted) {
        console.log('⚠️ [DailyScores] Component unmounted, skipping retry');
        return;
      }

      // Retry logic
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 [DailyScores] Retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

        // Check again if still mounted before retrying
        if (isMounted) {
          return fetchDailyScores(retryCount + 1, isMounted);
        }
      } else {
        console.error(`❌ [DailyScores] Max retries reached`);
        setError(err instanceof Error ? err.message : 'Failed to load scores. Please try again.');
        setLoading(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-neutral-900 border-neutral-800 text-neutral-100 max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-white">
              Live Daily Scores
            </DialogTitle>
            {lastUpdated && (
              <div className="text-xs text-neutral-500">
                Last snapshot: {lastUpdated.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </div>
            )}
          </div>
        </DialogHeader>

        <Separator className="bg-neutral-800" />

        {loading ? (
          <div className="space-y-3 py-6">
            <Skeleton className="h-10 w-full bg-neutral-800" />
            <Skeleton className="h-16 w-full bg-neutral-800" />
            <Skeleton className="h-16 w-full bg-neutral-800" />
            <Skeleton className="h-16 w-full bg-neutral-800" />
            {error && (
              <div className="text-center text-sm text-neutral-400">
                Retrying...
              </div>
            )}
          </div>
        ) : error ? (
          <Alert variant="destructive" className="bg-red-900/20 border-red-800">
            <AlertDescription className="text-red-400">
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        ) : userScores.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-neutral-400">No participants yet.</p>
            <p className="text-sm text-neutral-500">Buy KOL tokens to join the competition!</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="space-y-4 pr-4">
              {/* Header */}
              <div className="grid grid-cols-[50px_minmax(100px,1fr)_80px_70px_40px] gap-2 px-3 pb-3 text-xs uppercase tracking-wider text-neutral-400 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
                <div className="text-center">Rank</div>
                <div className="truncate">Wallet</div>
                <div className="text-right">Score</div>
                <div className="text-right">KOLs</div>
                <div></div>
              </div>

              {/* Scores List */}
              <div className="space-y-2 pt-2">
                {userScores.map((userScore, index) => {
                  const isExpanded = expandedUsers.has(userScore.userId);
                  const displayAddress = `${userScore.userWallet.substring(0, 6)}...${userScore.userWallet.substring(userScore.userWallet.length - 4)}`;
                  const rank = index + 1;

                  return (
                    <div key={userScore.userId} className="space-y-2">
                      {/* User Row */}
                      <div
                        className="grid grid-cols-[50px_minmax(100px,1fr)_80px_70px_40px] gap-2 items-center px-3 py-3 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 transition-colors cursor-pointer"
                        onClick={() => toggleUserExpanded(userScore.userId)}
                      >
                        {/* Rank */}
                        <div className="flex items-center justify-center">
                          <Badge
                            variant="outline"
                            className={`h-7 w-7 flex items-center justify-center text-xs font-bold ${
                              rank === 1
                                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                                : rank === 2
                                ? 'bg-gray-400/20 text-gray-300 border-gray-400/50'
                                : rank === 3
                                ? 'bg-orange-600/20 text-orange-400 border-orange-600/50'
                                : 'bg-neutral-700 text-neutral-300 border-neutral-600'
                            }`}
                          >
                            {rank}
                          </Badge>
                        </div>

                        {/* Wallet Address */}
                        <div className="font-mono text-sm text-neutral-200 truncate">
                          {displayAddress}
                        </div>

                        {/* Daily Score */}
                        <div className="text-right font-semibold text-sm truncate">
                          {userScore.lastUpdated ? (
                            <span className="text-emerald-400">{userScore.totalDailyScore.toFixed(2)}</span>
                          ) : (
                            <span className="text-neutral-500" title="Waiting for next snapshot">
                              {userScore.totalDailyScore.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Holdings Count */}
                        <div className="text-right text-neutral-300 text-sm">
                          {userScore.holdingsCount}
                        </div>

                        {/* Expand/Collapse Icon */}
                        <div className="flex justify-center">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Holdings */}
                      {isExpanded && (
                        <div className="ml-6 mr-2 space-y-1">
                          {userScore.holdings.map((holding) => (
                            <div
                              key={holding.holdingId}
                              className="grid grid-cols-[minmax(100px,1fr)_90px_80px] gap-2 px-3 py-2 rounded bg-neutral-900/50 text-sm"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-neutral-300 truncate">{holding.traderName}</span>
                                <Badge variant="secondary" className="text-xs flex-shrink-0">
                                  {holding.traderTicker}
                                </Badge>
                              </div>
                              <div className="text-right text-neutral-400 text-xs truncate">
                                {parseFloat(holding.tokenAmount).toFixed(2)}
                              </div>
                              <div className="text-right font-semibold text-emerald-400 text-sm truncate">
                                {parseFloat(holding.dailyScore).toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}

        <Separator className="bg-neutral-800" />

        <div className="text-xs text-neutral-500 text-center py-2 space-y-1">
          <p>Scores update every snapshot (test: every 2min, prod: daily at 14:00 UTC).</p>
          <p className="text-neutral-600">Gray scores are pending next snapshot. Keep trading to improve your rank!</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
