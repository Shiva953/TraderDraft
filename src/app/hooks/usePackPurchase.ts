import { useState, useCallback } from 'react';
import { useSendTransaction, useSolanaWallets } from "@privy-io/react-auth/solana";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { Buffer } from "buffer";
import type { PurchaseState, BuyPackResponse } from '@/types';

const connection = new Connection("https://api.devnet.solana.com", { commitment: "confirmed" });

export const usePackPurchase = () => {
  const [state, setState] = useState<PurchaseState>({
    isLoading: false,
    txnHash: null,
    showSuccess: false,
    error: null,
  });

  const { wallets } = useSolanaWallets();
  const { sendTransaction } = useSendTransaction();

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      txnHash: null,
      showSuccess: false,
      error: null,
    });
  }, []);

  const purchasePacks = useCallback(async (packCount: number, totalPrice: number) => {
    if (!wallets || wallets.length === 0) {
      setState(prev => ({ ...prev, error: "No wallet found. Please connect your wallet first." }));
      return false;
    }

    const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
    if (!embeddedWallet) {
      setState(prev => ({ ...prev, error: "No embedded wallet found." }));
      return false;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      showSuccess: false
    }));

    try {
      console.log("🔵 [BuyPack] Starting transaction process");
      console.log("🔵 [BuyPack] Wallet address:", embeddedWallet.address);
      console.log("🔍 [BuyPack] packCount:", packCount);
      console.log("🔍 [BuyPack] totalPrice:", totalPrice);

      // Refresh wallet session before signing
      console.log("🔄 [BuyPack] Ensuring wallet session is fresh...");
      try {
        await embeddedWallet.loginOrLink();
      } catch (refreshError) {
        console.warn("⚠️ [BuyPack] Session refresh failed, continuing anyway:", refreshError);
      }

      // Step 1: Get transaction from API
      const response = await fetch("/api/pack/buyPack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userPrivyWalletAddress: embeddedWallet.address,
          amount: totalPrice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data: BuyPackResponse = await response.json();
      console.log("🟢 [BuyPack] API response:", data);

      if (!data.success || !data.data.buyPackTransaction) {
        throw new Error(data.error || "Failed to create transaction");
      }

      console.log("🔄 [BuyPack] Deserializing transaction");

      // Step 2: Deserialize and send transaction
      const txBuffer = Buffer.from(data.data.buyPackTransaction, "base64");
      const transaction = VersionedTransaction.deserialize(txBuffer);

      console.log("🟡 [BuyPack] Transaction deserialized, signing and sending...");

      const result = await sendTransaction({
        transaction: transaction,
        connection: connection,
        address: embeddedWallet.address,
      });

      console.log("✅ [BuyPack] Transaction sent successfully:", result);

      // Step 3: Update database with purchase info (WITH RETRY LOGIC - CRITICAL!)
      console.log("🔄 [BuyPack] Updating user packs in database...");
      
      const updatePacksWithRetry = async (retryCount = 0): Promise<boolean> => {
        const MAX_RETRIES = 5; // More retries since this is critical after successful transaction
        const RETRY_DELAY = 2000; // 2 seconds between retries

        try {
          console.log(`🔄 [BuyPack] Update attempt ${retryCount + 1}/${MAX_RETRIES + 1}...`);
          
          const updateResponse = await fetch("/api/pack/updateUserPacks", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userPrivyWalletAddress: embeddedWallet.address,
              packsBought: packCount,
              totalValue: totalPrice,
              transactionHash: result.signature,
            }),
          });

          const updateData = await updateResponse.json();
          
          if (!updateResponse.ok || !updateData.success) {
            throw new Error(updateData.error || `HTTP ${updateResponse.status}: Update failed`);
          }
          
          console.log("✅ [BuyPack] User packs updated successfully");
          return true;
          
        } catch (error) {
          console.error(`❌ [BuyPack] Update attempt ${retryCount + 1} failed:`, error);
          
          if (retryCount < MAX_RETRIES) {
            console.log(`⏳ [BuyPack] Retrying in ${RETRY_DELAY}ms... (${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return updatePacksWithRetry(retryCount + 1);
          } else {
            console.error(`❌ [BuyPack] MAX RETRIES REACHED - Update failed permanently!`);
            console.error(`⚠️ [BuyPack] Transaction succeeded but DB update failed. TxHash: ${result.signature}`);
            return false;
          }
        }
      };

      const updateSuccess = await updatePacksWithRetry();
      if (!updateSuccess) {
        // Show warning but don't block success state since transaction completed
        console.warn("⚠️ [BuyPack] Packs purchased but database update failed. Contact support with transaction hash.");
      }

      // Success state
      setState({
        isLoading: false,
        txnHash: result.signature,
        showSuccess: true,
        error: null,
      });

      return true;

    } catch (error) {
      console.error("❌ [BuyPack] Error buying packs:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      return false;
    }
  }, [wallets, sendTransaction]);

  return {
    ...state,
    purchasePacks,
    resetState,
  };
};