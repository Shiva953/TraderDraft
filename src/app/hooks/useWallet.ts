import { useMemo } from 'react';
import { useSolanaWallets, usePrivy } from '@privy-io/react-auth';

export const useWallet = () => {
  const { wallets } = useSolanaWallets();
  const { ready, authenticated } = usePrivy();

  const walletData = useMemo(() => {
    if (!ready || !authenticated || !wallets?.length) {
      return {
        address: '',
        fullAddress: '',
        isLoading: !ready,
        isConnected: false,
        embeddedWallet: null,
      };
    }

    const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
    
    return {
      address: embeddedWallet?.address?.substring(0, 6) || '',
      fullAddress: embeddedWallet?.address || '',
      isLoading: false,
      isConnected: !!embeddedWallet?.address,
      embeddedWallet,
    };
  }, [wallets, ready, authenticated]);

  return walletData;
};