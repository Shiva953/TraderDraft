// hooks/useCompetitionScheduler.ts
// Place this file in your hooks directory

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface Competition {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface UseCompetitionSchedulerProps {
  activeCompetition: Competition | null;
  onScoreUpdate?: () => void;
  onCompetitionEnd?: () => void;
}

/**
 * Hook to automatically trigger daily score calculations and competition finalization
 * For testing: Runs score calculation every 10 minutes
 * For production: Should run daily at 14:00 UTC
 */
export function useCompetitionScheduler({
  activeCompetition,
  onScoreUpdate,
  onCompetitionEnd
}: UseCompetitionSchedulerProps) {
  const scoreIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const finalizationCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate daily scores every 10 minutes (testing mode)
  useEffect(() => {
    if (!activeCompetition || activeCompetition.status !== 'ACTIVE') {
      if (scoreIntervalRef.current) {
        clearInterval(scoreIntervalRef.current);
        scoreIntervalRef.current = null;
      }
      return;
    }

    const calculateScores = async () => {
      try {
        console.log(`[Scheduler] Calculating daily scores for competition ${activeCompetition.id}`);
        
        const response = await fetch(
          `/api/competitions/${activeCompetition.id}/dailyUserScore`,
          { method: 'POST' }
        );

        if (response.ok) {
          const data = await response.json();
          console.log(`[Scheduler] Score calculation complete:`, data);
          
          if (onScoreUpdate) {
            onScoreUpdate();
          }
        } else {
          console.error('[Scheduler] Failed to calculate scores:', await response.text());
        }
      } catch (error) {
        console.error('[Scheduler] Error calculating scores:', error);
      }
    };

    // Initial calculation
    calculateScores();

    // Set interval for 10 minutes (testing mode)
    // For production: Use cron job instead of client-side interval
    scoreIntervalRef.current = setInterval(calculateScores, 10 * 60 * 1000);

    return () => {
      if (scoreIntervalRef.current) {
        clearInterval(scoreIntervalRef.current);
      }
    };
  }, [activeCompetition, onScoreUpdate]);

  // Check for competition end and finalize
  useEffect(() => {
    if (!activeCompetition || activeCompetition.status !== 'ACTIVE') {
      if (finalizationCheckRef.current) {
        clearInterval(finalizationCheckRef.current);
        finalizationCheckRef.current = null;
      }
      return;
    }

    const checkAndFinalize = async () => {
      const now = new Date();
      const endDate = new Date(activeCompetition.endDate);

      if (now >= endDate) {
        try {
          console.log(`[Scheduler] Competition ended, finalizing ${activeCompetition.id}`);
          toast.loading('Competition ended! Calculating final results...');

          const response = await fetch(
            `/api/competitions/${activeCompetition.id}/finalize`,
            { method: 'POST' }
          );

          if (response.ok) {
            const data = await response.json();
            console.log(`[Scheduler] Competition finalized:`, data);
            
            toast.success('Competition finalized! Check the results.');
            
            if (onCompetitionEnd) {
              onCompetitionEnd();
            }

            // Clear interval after finalization
            if (finalizationCheckRef.current) {
              clearInterval(finalizationCheckRef.current);
              finalizationCheckRef.current = null;
            }
          } else {
            console.error('[Scheduler] Failed to finalize:', await response.text());
            toast.error('Failed to finalize competition');
          }
        } catch (error) {
          console.error('[Scheduler] Error finalizing competition:', error);
          toast.error('Error finalizing competition');
        }
      }
    };

    // Check every minute for competition end
    finalizationCheckRef.current = setInterval(checkAndFinalize, 60 * 1000);

    // Initial check
    checkAndFinalize();

    return () => {
      if (finalizationCheckRef.current) {
        clearInterval(finalizationCheckRef.current);
      }
    };
  }, [activeCompetition, onCompetitionEnd]);
}