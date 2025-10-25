'use client'

import { useState, useEffect, useCallback } from 'react';

interface PhaseData {
  success: boolean;
  phase: 'INITIALIZING' | 'PACK_SALE' | 'PACK_REVEAL' | 'COMPETITION_ACTIVE' | 'COMPETITION_RESULTS' | 'WAITING_FOR_NEXT_COMPETITION';
  message: string;
  phaseStartedAt?: string;
  endsAt?: string;
  timeRemainingMs?: number;
  endsIn?: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
  competition?: {
    id: string;
    startDate: string;
    endDate: string;
    status: string;
    tpPool: string;
  };
}

/**
 * Hook to fetch current app phase
 * Polls /api/getCurrentPhase every 30 seconds to detect phase transitions
 *
 * Phases:
 * - PACK_SALE: Users can buy packs (Day 0-7)
 * - PACK_REVEAL: Users can reveal packs, KOL tokens created (Day 7-10)
 * - COMPETITION_ACTIVE: Competition is running (Day 10+)
 * - COMPETITION_RESULTS: Competition ended, viewing results
 * - WAITING_FOR_NEXT_COMPETITION: Cooldown between competitions
 * - INITIALIZING: Waiting for first cron run
 */
export function useAppPhase() {
  const [phaseData, setPhaseData] = useState<PhaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPhase = useCallback(async () => {
    try {
      const response = await fetch('/api/getCurrentPhase');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch current phase`);
      }

      const data: PhaseData = await response.json();
      setPhaseData(data);
      setError(null);
      console.log('✅ [useAppPhase] Current phase:', data.phase);
    } catch (err) {
      console.error('❌ [useAppPhase] Error fetching phase:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch phase');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchPhase();

    // Poll every 30 seconds to detect phase transitions
    const interval = setInterval(fetchPhase, 30000);

    return () => clearInterval(interval);
  }, [fetchPhase]);

  return {
    phaseData,
    loading,
    error,
    refresh: fetchPhase
  };
}