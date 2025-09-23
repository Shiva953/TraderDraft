import { useEffect, useMemo } from 'react';
import { useWallet } from './useWallet';
import { useApi } from './useApi';

export interface UserPacksData {
  packHoldings: number;
  totalValueOfPackHoldings: number;
  claimedPacks: number;
  unclaimedPacks: number;
}

export const useUserPacks = () => {
  const { fullAddress, isConnected } = useWallet();
  const { data, loading, error, execute } = useApi<UserPacksData>('/api/pack/getUserPacks', {
    dedupe: true,
    cacheTtl: 30000, 
  });

  const refresh = useMemo(() => {
    if (!isConnected || !fullAddress) return () => Promise.resolve();
    
    return () => execute({ userPrivyWalletAddress: fullAddress });
  }, [execute, fullAddress, isConnected]);

  useEffect(() => {
    if (isConnected && fullAddress) {
      refresh();
    }
  }, [isConnected, fullAddress, refresh]);

  return {
    data,
    loading,
    error,
    refresh,
    isConnected,
  };
};