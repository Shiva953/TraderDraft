// hooks/useDevBackgroundJobs.ts
'use client';

import { useState } from 'react';

interface BackgroundJobStatus {
  ok?: boolean;
  status?: {
    activeJobs: string[];
    isRunning: boolean;
    timestamp: string;
  };
  message: string;
  error?: string;
}

export function useDevBackgroundJobs() {
  const [isTriggering, setIsTriggering] = useState(false);

  const triggerManualUpdate = async (): Promise<BackgroundJobStatus | null> => {
    if (process.env.NODE_ENV !== 'development') return null;

    setIsTriggering(true);
    
    try {
      const response = await fetch('/api/cron-status', {
        method: 'POST'
      });
      
      const result: BackgroundJobStatus = await response.json();
      console.log('✅ [DEV] Manual update result:', result);
      
      return result;
    } catch (error) {
      console.error('❌ [DEV] Failed to trigger manual update:', error);
      return { 
        message: 'Failed to trigger update',
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setIsTriggering(false);
    }
  };

  const getStatus = async (): Promise<BackgroundJobStatus | null> => {
    if (process.env.NODE_ENV !== 'development') return null;

    try {
      const response = await fetch('/api/cron-status');
      return await response.json();
    } catch (error) {
      console.error('❌ [DEV] Failed to get background job status:', error);
      return { 
        message: 'Failed to get status',
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  return {
    triggerManualUpdate,
    getStatus,
    isTriggering
  };
}

// To add to your existing app/page.tsx, add this import:
// import { useDevBackgroundJobs } from "../hooks/useDevBackgroundJobs";

// Then in your Home component, add:
// const { triggerManualUpdate, isTriggering } = useDevBackgroundJobs();

// And add this button next to your logout button in the header:
/*
{process.env.NODE_ENV === 'development' && (
  <button 
    onClick={triggerManualUpdate} 
    disabled={isTriggering}
    className="rounded-full border border-orange-500/20 px-4 py-2 text-sm text-orange-300 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all duration-200 cursor-pointer disabled:opacity-50"
  >
    {isTriggering ? 'Updating...' : 'Trigger Update'}
  </button>
)}
*/