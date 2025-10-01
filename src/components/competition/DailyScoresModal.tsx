'use client'

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [scores, setScores] = useState<DailyScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && competitionId) {
      fetchDailyScores();
    }
  }, [open, competitionId]);

  const fetchDailyScores = async () => {
    if (!competitionId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/competitions/${competitionId}/leaderboard`);

      if (!response.ok) {
        throw new Error('Failed to fetch scores');
      }

      const data = await response.json();

      // Transform the data to include display addresses and rankings
      const transformedScores = data.leaderboard?.map((entry: any, index: number) => ({
        userPrivyWalletAddress: entry.userPrivyWalletAddress,
        displayAddress: `${entry.userPrivyWalletAddress.substring(0, 6)}...${entry.userPrivyWalletAddress.substring(entry.userPrivyWalletAddress.length - 4)}`,
        windowScore: entry.windowScore || 0,
        tournamentPoints: entry.tournamentPoints || 0,
        rank: index + 1,
      })) || [];

      setScores(transformedScores);
    } catch (err) {
      console.error('Error fetching daily scores:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scores');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-neutral-900 border-neutral-800 text-neutral-100 max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            Live Daily Scores
          </DialogTitle>
        </DialogHeader>

        <Separator className="bg-neutral-800" />

        {loading ? (
          <div className="space-y-3 py-6">
            <Skeleton className="h-10 w-full bg-neutral-800" />
            <Skeleton className="h-16 w-full bg-neutral-800" />
            <Skeleton className="h-16 w-full bg-neutral-800" />
            <Skeleton className="h-16 w-full bg-neutral-800" />
          </div>
        ) : error ? (
          <Alert variant="destructive" className="bg-red-900/20 border-red-800">
            <AlertDescription className="text-red-400">
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        ) : scores.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            No scores available yet. Start trading to appear on the leaderboard!
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {/* Header */}
              <div className="grid grid-cols-[60px_1fr_120px_120px] gap-4 px-4 pb-3 text-xs uppercase tracking-wider text-neutral-400 border-b border-neutral-800 sticky top-0 bg-neutral-900">
                <div>Rank</div>
                <div>Wallet</div>
                <div className="text-right">Daily Score</div>
                <div className="text-right">Total TP</div>
              </div>

              {/* Scores List */}
              <div className="space-y-2 pt-3">
                {scores.map((score) => (
                  <div
                    key={score.userPrivyWalletAddress}
                    className="grid grid-cols-[60px_1fr_120px_120px] gap-4 items-center px-4 py-3 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 transition-colors"
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center">
                      <Badge
                        variant="outline"
                        className={`h-8 w-8 flex items-center justify-center text-xs font-bold ${
                          score.rank === 1
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                            : score.rank === 2
                            ? 'bg-gray-400/20 text-gray-300 border-gray-400/50'
                            : score.rank === 3
                            ? 'bg-orange-600/20 text-orange-400 border-orange-600/50'
                            : 'bg-neutral-700 text-neutral-300 border-neutral-600'
                        }`}
                      >
                        {score.rank}
                      </Badge>
                    </div>

                    {/* Wallet Address */}
                    <div className="font-mono text-sm text-neutral-200">
                      {score.displayAddress}
                    </div>

                    {/* Daily Score */}
                    <div className="text-right font-semibold text-emerald-400">
                      {score.windowScore.toLocaleString()}
                    </div>

                    {/* Total TP */}
                    <div className="text-right font-semibold text-pink-400">
                      {score.tournamentPoints.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}

        <Separator className="bg-neutral-800" />

        <div className="text-xs text-neutral-500 text-center py-2">
          Scores update daily at end of day. Keep trading to improve your rank!
        </div>
      </DialogContent>
    </Dialog>
  );
}
