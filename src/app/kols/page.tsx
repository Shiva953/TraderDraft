'use client'

import { useState, useCallback } from "react";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { Button } from "@/components/ui/button";
import { useLeaderboard } from "../hooks/useLeaderboard";
import { useActiveCompetition } from "../hooks/useActiveCompetition";

export default function KOLsPage() {
  const {
    leaderboardData,
    loading: leaderboardLoading,
    error: leaderboardError,
    currentPeriod,
    lastUpdated,
    autoRefresh,
    setAutoRefresh,
    changePeriod,
    refresh: refreshLeaderboard,
  } = useLeaderboard();

  const {
    isActive: isCompetitionActive
  } = useActiveCompetition();

  const getPeriodTitle = useCallback(() => {
    switch (currentPeriod) {
      case 'weekly': return 'Top Traders This Week';
      case 'monthly': return 'Top Traders This Month';
      default: return 'Top Traders Today';
    }
  }, [currentPeriod]);

  const handleRefresh = useCallback(async () => {
    console.log('🔄 [KOLs Page] Manual refresh triggered');
    try {
      await refreshLeaderboard();
      console.log('✅ [KOLs Page] Manual refresh completed');
    } catch (error) {
      console.error('❌ [KOLs Page] Manual refresh failed:', error);
    }
  }, [refreshLeaderboard]);

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-neutral-100 mb-2">KOL Leaderboard</h1>
          <p className="text-neutral-400">Top performing traders on Solana</p>
        </header>

        <div id="kol-leaderboard" className="rounded-2xl border border-neutral-800 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-400">Period:</span>
                <select
                  value={currentPeriod}
                  onChange={(e) => changePeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  className="rounded bg-neutral-800 border border-neutral-600 text-white text-sm px-2 py-1"
                  disabled={leaderboardLoading}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-400">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded bg-neutral-800 border-neutral-600"
                  disabled={leaderboardLoading}
                />
                Auto-refresh (1min)
              </label>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-neutral-500">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Button
                onClick={handleRefresh}
                disabled={leaderboardLoading}
                size="sm"
                variant="secondary"
                className="bg-neutral-700 hover:bg-neutral-600 text-neutral-300"
              >
                {leaderboardLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-neutral-300 mr-1"></div>
                    Refreshing...
                  </>
                ) : (
                  '↻ Refresh'
                )}
              </Button>
            </div>
          </div>

          <Leaderboard
            title={getPeriodTitle()}
            entries={leaderboardData || []}
            loading={leaderboardLoading || !leaderboardData || leaderboardData.length === 0}
            showActions={isCompetitionActive}
          />
        </div>
      </div>
    </main>
  );
}
