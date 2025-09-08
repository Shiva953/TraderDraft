// hooks/useDevBackgroundJobs.ts
import { useEffect, useState, useCallback } from 'react';

interface BackgroundJobsConfig {
  enabled: boolean;
  interval: number; // in milliseconds
  autoStart: boolean;
}

export function useDevBackgroundJobs(config: BackgroundJobsConfig = {
  enabled: process.env.NODE_ENV === 'development',
  interval: 5 * 60 * 1000, // 5 minutes in development
  autoStart: false
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerUpdate = useCallback(async () => {
    if (!config.enabled || isTriggering) return;

    setIsTriggering(true);
    setError(null);

    try {
      console.log("🔄 [DEV-JOBS] Triggering background update...");
      
      const response = await fetch('/api/updateDBPeriodically', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'dev-secret'}`
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`Update failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("✅ [DEV-JOBS] Background update completed:", result);
      
      setLastUpdate(new Date());
    } catch (err) {
      console.error('❌ [DEV-JOBS] Background update failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsTriggering(false);
    }
  }, [config.enabled, isTriggering]);

  const startBackgroundJobs = useCallback(() => {
    if (!config.enabled || isRunning) return;

    console.log(`🚀 [DEV-JOBS] Starting background jobs (interval: ${config.interval / 1000}s)`);
    setIsRunning(true);

    const interval = setInterval(triggerUpdate, config.interval);

    return () => {
      console.log("🛑 [DEV-JOBS] Stopping background jobs");
      clearInterval(interval);
      setIsRunning(false);
    };
  }, [config.enabled, config.interval, isRunning, triggerUpdate]);

  const stopBackgroundJobs = useCallback(() => {
    setIsRunning(false);
  }, []);

  // Manual trigger for testing
  const triggerManualUpdate = useCallback(() => {
    console.log("🔧 [DEV-JOBS] Manual update triggered");
    triggerUpdate();
  }, [triggerUpdate]);

  // Auto-start if configured
  useEffect(() => {
    if (config.autoStart && config.enabled) {
      const cleanup = startBackgroundJobs();
      return cleanup;
    }
  }, [config.autoStart, config.enabled, startBackgroundJobs]);

  return {
    isRunning,
    isTriggering,
    lastUpdate,
    error,
    startBackgroundJobs,
    stopBackgroundJobs,
    triggerManualUpdate,
    triggerUpdate
  };
}