'use client'

import { useState, useEffect } from 'react';

interface Competition {
  id: string;
  startDate: Date;
  endDate: Date;
  status: string;
  tpPool: number;
}

export function useActiveCompetition() {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveCompetition();

    // Poll every minute to check if competition status changed
    const interval = setInterval(fetchActiveCompetition, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveCompetition = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/competitions/start', {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10s timeout
      });

      if (!response.ok) {
        throw new Error('Failed to fetch active competition');
      }

      const data = await response.json();

      if (data.success && data.competition) {
        setCompetition({
          id: data.competition.id,
          startDate: new Date(data.competition.startDate),
          endDate: new Date(data.competition.endDate),
          status: data.competition.status,
          tpPool: parseInt(data.competition.tpPool)
        });
      } else {
        // No active competition
        setCompetition(null);
      }
    } catch (err) {
      console.error('❌ [useActiveCompetition] Error fetching competition:', err);
      
      // Retry up to 2 times with exponential backoff
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
        console.log(`⏳ [useActiveCompetition] Retrying in ${delay}ms (attempt ${retryCount + 1}/2)`);
        setTimeout(() => fetchActiveCompetition(retryCount + 1), delay);
        return;
      }
      
      setError(err instanceof Error ? err.message : 'Failed to fetch competition');
      setCompetition(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    competition,
    loading,
    error,
    isActive: competition?.status === 'ACTIVE' && competition?.endDate > new Date(),
    refresh: fetchActiveCompetition
  };
}
