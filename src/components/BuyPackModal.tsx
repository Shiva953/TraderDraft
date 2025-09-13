'use client';

import { useState, useEffect } from 'react';
import { useSendTransaction, useSolanaWallets, useStandardSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { Connection, VersionedTransaction } from '@solana/web3.js';

interface BuyPackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const connection = new Connection("http://api.devnet.solana.com", {commitment: "confirmed"})

export default function BuyPackModal({ isOpen, onClose }: BuyPackModalProps) {
  const [packCount, setPackCount] = useState(100); // Start with 100 as shown in image
  const [isLoading, setIsLoading] = useState(false);
  const [txnHash, setTxnHash] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const { wallets } = useSolanaWallets();
  const { sendTransaction } = useSendTransaction()

  const totalPrice = packCount * 0.1;
  const maxPacks = 2500; // Maximum packs as shown in image

  const handleBuyPacks = async () => {
    if (!wallets || wallets.length === 0) {
      alert('No wallet found. Please connect your wallet first.');
      return;
    }

    const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
    if (!embeddedWallet) {
      alert('No embedded wallet found.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔵 [BuyPack] Starting transaction process');
      console.log('🔵 [BuyPack] Wallet address:', embeddedWallet.address);
      console.log(' [BuyPack] Total price:', totalPrice);

      // Call the buyPack API
      const response = await fetch('/api/buyPack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrivyWalletAddress: embeddedWallet.address,
          amount: totalPrice,
        }),
      });

      const data = await response.json();
      console.log('🟢 [BuyPack] API response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      if (data.success && data.data.buyPackTransaction) {
        console.log('🔄 [BuyPack] Deserializing transaction');
        
        // Deserialize the transaction from base64
        const txBuffer = Buffer.from(data.data.buyPackTransaction, 'base64');
        const transaction = VersionedTransaction.deserialize(txBuffer);
        
        console.log('🟡 [BuyPack] Transaction deserialized, signing and sending...');

        // Sign and send the transaction using Privy
        const result = await sendTransaction({
          transaction: transaction,
          connection: connection,
          address: embeddedWallet.address,
        });
        
        console.log('✅ [BuyPack] Transaction sent successfully:', result);
        
        setTxnHash(result.signature);
        setShowSuccess(true);
        
        // Update user packs in database
        console.log('🔄 [BuyPack] Updating user packs in database...');
        try {
          const updateResponse = await fetch('/api/updateUserPacks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userPrivyWalletAddress: embeddedWallet.address,
              packsBought: packCount,
              totalValue: totalPrice,
            }),
          });

          const updateData = await updateResponse.json();
          if (updateData.success) {
            console.log('✅ [BuyPack] User packs updated successfully');
          } else {
            console.error('❌ [BuyPack] Failed to update user packs:', updateData.error);
          }
        } catch (updateError) {
          console.error('❌ [BuyPack] Error updating user packs:', updateError);
        }
        
        // Close modal after 3 seconds
        setTimeout(() => {
          onClose();
          setShowSuccess(false);
          setTxnHash(null);
          setPackCount(100);
        }, 3000);
      } else {
        throw new Error(data.error || 'Failed to create transaction');
      }
    } catch (error) {
      console.error('❌ [BuyPack] Error buying packs:', error);
      alert(`Error buying packs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setShowSuccess(false);
      setTxnHash(null);
      setPackCount(100);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
        {!showSuccess ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Choose How Many Packs You Want</h2>
            </div>

            <div className="space-y-6">
              {/* Quantity Selection */}
              <div className="rounded-lg border border-neutral-700 p-4 bg-neutral-800/50">
                <div className="mb-3">
                  <span className="text-sm text-neutral-400 uppercase tracking-wide">Quantity</span>
                </div>
                <div className="text-4xl font-bold text-white mb-4">
                  {packCount}
                </div>
                <input
                  type="range"
                  min="0"
                  max={maxPacks}
                  step="10" // Increments of 10 packs (1 SOL)
                  value={packCount}
                  onChange={(e) => setPackCount(Number(e.target.value))}
                  className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
                  disabled={isLoading}
                />
                <div className="flex justify-between text-xs text-neutral-500 mt-2">
                  <span>0</span>
                  <span>{maxPacks}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="rounded-lg border border-neutral-700 p-4 bg-neutral-800/50">
                <div className="mb-3">
                  <span className="text-sm text-neutral-400 uppercase tracking-wide">You Pay</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-white">{totalPrice} SOL</span>
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-black">S</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Receipt Details */}
              <div className="rounded-lg border border-neutral-700 p-4 bg-neutral-800/50">
                <div className="mb-3">
                  <span className="text-sm text-neutral-400 uppercase tracking-wide">You Receive</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-white">{packCount} Packs</span>
                  <div className="w-6 h-6 bg-red-500 rounded-full"></div>
                </div>
              </div>

              <button
                onClick={handleBuyPacks}
                disabled={isLoading || packCount === 0}
                className="w-full group relative flex items-center justify-center gap-3 rounded-full px-6 py-4 text-base font-semibold text-white bg-black shadow-lg transition-all duration-200 hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-neutral-400/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  `Buy ${packCount} Pack${packCount > 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="mb-6">
              {/* Main success message */}
              <div className="bg-black rounded-lg p-8 mb-4">
                <h2 className="text-3xl font-bold text-white uppercase tracking-wider">
                  The Mystery Awaits...
                </h2>
              </div>
              
              {/* Reveal details */}
              <div className="mb-6">
                <p className="text-lg text-neutral-300 uppercase tracking-wide">
                  Your Packs Will Be Sent To You
                </p>
                <p className="text-lg text-neutral-300 uppercase tracking-wide">
                  And Revealed On 20th Sep 2025
                </p>
              </div>
              
              {/* Order confirmation */}
              <div className="rounded-lg border border-neutral-700 p-4 bg-neutral-800/50">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-sm text-green-400 uppercase tracking-wide mb-1">Order Successful</p>
                    <p className="text-2xl font-bold text-white uppercase">{packCount} Packs</p>
                  </div>
                  <div className="w-6 h-6 bg-red-500 rounded-full"></div>
                </div>
              </div>
              
              {txnHash && (
                <div className="mt-4 rounded-lg border border-neutral-700 p-3 bg-neutral-800/50">
                  <p className="text-xs text-neutral-400 mb-1">Transaction Hash:</p>
                  <p className="text-sm text-green-400 font-mono break-all">{txnHash}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}