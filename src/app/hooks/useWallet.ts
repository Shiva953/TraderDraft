import { useMemo, useCallback } from 'react';
import { useSolanaWallets, usePrivy } from '@privy-io/react-auth';
import type { Transaction, VersionedTransaction } from '@solana/web3.js';

export const useWallet = () => {
  const { wallets } = useSolanaWallets();
  const { ready, authenticated, getAccessToken } = usePrivy();

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


  const signTransaction = useCallback(async (transaction: Transaction | VersionedTransaction) => {
    try {
      // Get fresh access token before signing
      await getAccessToken();
      
      if (!walletData.embeddedWallet) {
        throw new Error('No embedded wallet found');
      }

      const signedTransaction = await walletData.embeddedWallet.signTransaction(transaction);
      return signedTransaction;
    } catch (error) {
      console.error('Transaction signing failed:', error);
      throw error;
    }
  }, [getAccessToken, walletData.embeddedWallet]);

  // Sign multiple transactions
  const signAllTransactions = useCallback(async (transactions: (Transaction | VersionedTransaction)[]) => {
    try {
      await getAccessToken();
      
      if (!walletData.embeddedWallet) {
        throw new Error('No embedded wallet found');
      }

      const signedTransactions = await walletData.embeddedWallet.signAllTransactions(transactions);
      return signedTransactions;
    } catch (error) {
      console.error('Batch transaction signing failed:', error);
      throw error;
    }
  }, [getAccessToken, walletData.embeddedWallet]);

  
  const signMessage = useCallback(async (message: string | Uint8Array) => {
    try {
      await getAccessToken();
      
      if (!walletData.embeddedWallet) {
        throw new Error('No embedded wallet found');
      }

      const messageBytes = typeof message === 'string' 
        ? new TextEncoder().encode(message)
        : message;

      const signature = await walletData.embeddedWallet.signMessage(messageBytes);
      return signature;
    } catch (error) {
      console.error('Message signing failed:', error);
      throw error;
    }
  }, [getAccessToken, walletData.embeddedWallet]);

  return {
    ...walletData,
    signTransaction,
    signAllTransactions,
    signMessage,
  };
};