'use client'

import { useState, useEffect, useCallback } from 'react';

interface Competition {
  id: string;
  startDate: Date;
  endDate: Date;
  status: 'ACTIVE' | 'ENDED' | 'FINALIZED';
  tpPool: number;
}

interface UseActiveCompetitionOptions {
  enabled?: boolean; // Allow disabling the hook
}

export function useActiveCompetition(options: UseActiveCompetitionOptions = {}) {
  const { enabled = true } = options;
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [lastFinalized, setLastFinalized] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveCompetition = useCallback(async (retryCount = 0) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds

    try {
      setLoading(true);
      setError(null);

      console.log(`🔄 [useActiveCompetition] Fetching competition (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);

      const response = await fetch('/api/competitions/start', {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10s timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch active competition`);
      }

      const data = await response.json();

      if (data.success && data.competition) {
        const newCompetition = {
          id: data.competition.id,
          startDate: new Date(data.competition.startDate),
          endDate: new Date(data.competition.endDate),
          status: data.competition.status,
          tpPool: parseInt(data.competition.tpPool)
        };

        setCompetition(newCompetition);
        console.log(`✅ [useActiveCompetition] Competition status: ${newCompetition.status}, ID: ${newCompetition.id}`);
      } else {
        // No active competition - check for last finalized
        setCompetition(null);
        console.log('ℹ️ [useActiveCompetition] No active competition found');
      }

      // Fetch last finalized competition separately
      try {
        const finalizedResponse = await fetch('/api/competitions/last-finalized');
        if (finalizedResponse.ok) {
          const finalizedData = await finalizedResponse.json();
          if (finalizedData.success && finalizedData.competition) {
            const lastFinalizedComp = {
              id: finalizedData.competition.id,
              startDate: new Date(finalizedData.competition.startDate),
              endDate: new Date(finalizedData.competition.endDate),
              status: finalizedData.competition.status,
              tpPool: parseInt(finalizedData.competition.tpPool)
            };
            setLastFinalized(lastFinalizedComp);
            console.log(`ℹ️ [useActiveCompetition] Last finalized: ${lastFinalizedComp.id}`);
          } else {
            setLastFinalized(null);
          }
        }
      } catch (err) {
        console.warn('Could not fetch last finalized competition:', err);
      }

      setLoading(false);
      setError(null);
    } catch (err) {
      console.error(`❌ [useActiveCompetition] Error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, err);

      // Retry logic
      if (retryCount < MAX_RETRIES && enabled) {
        console.log(`🔄 [useActiveCompetition] Retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchActiveCompetition(retryCount + 1);
      } else {
        console.error(`❌ [useActiveCompetition] Max retries reached`);
        setError(err instanceof Error ? err.message : 'Failed to fetch competition');
        setCompetition(null);
        setLastFinalized(null);
        setLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchActiveCompetition();

    // Poll every 30 seconds to catch status changes (ACTIVE -> FINALIZED)
    const pollInterval = setInterval(() => {
      console.log('🔄 [useActiveCompetition] Polling for competition updates...');
      fetchActiveCompetition();
    }, 30000); // 30 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchActiveCompetition, enabled]);

  return {
    competition,
    lastFinalized,
    loading,
    error,
    isActive: competition?.status === 'ACTIVE',
    refresh: fetchActiveCompetition, // Expose refresh function
  };
}