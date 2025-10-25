import { useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';

/**
 * Hook to automatically sync X/Twitter profile data after user authentication
 * This runs once after login to update the user's X profile info in the database
 */
export const useXProfileSync = () => {
  const { authenticated, ready, getAccessToken } = usePrivy();
  const hasSynced = useRef(false);

  useEffect(() => {
    const syncXProfile = async () => {
      // Only sync once per session and when user is authenticated
      if (!ready || !authenticated || hasSynced.current) {
        return;
      }

      try {
        const token = await getAccessToken();

        if (!token) {
          console.warn('⚠️ [useXProfileSync] No access token available');
          return;
        }

        console.log('🔄 [useXProfileSync] Syncing X profile...');

        const response = await fetch('/api/user/syncXProfile', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (data.ok) {
          console.log('✅ [useXProfileSync] X profile synced successfully:', data.user?.xUsername || 'No X account');
          hasSynced.current = true;
        } else {
          console.error('❌ [useXProfileSync] Failed to sync X profile:', data.error);
        }
      } catch (error) {
        console.error('❌ [useXProfileSync] Error syncing X profile:', error);
      }
    };

    syncXProfile();
  }, [ready, authenticated, getAccessToken]);

  return {
    syncing: ready && authenticated && !hasSynced.current,
  };
};
