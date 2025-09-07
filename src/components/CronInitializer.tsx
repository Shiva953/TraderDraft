'use client';

import { useEffect } from 'react';

export function CronInitializer() {
  useEffect(() => {
    // Only run cron jobs in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 [APP] Starting development cron jobs...');
      
      // Dynamic import to avoid SSR issues
      import('../lib/cronJobs').then(({ default: cronManager }) => {
        cronManager.startCronJobs();

        // Cleanup on component unmount
        return () => {
          console.log('🛑 [APP] Stopping cron jobs...');
          cronManager.stopCronJobs();
        };
      });
    }
  }, []);
  return null;
}