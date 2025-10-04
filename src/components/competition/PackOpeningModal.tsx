'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { X } from 'lucide-react';
import { MultiPackRevealResponse } from "@/types/pack";
import { motion, AnimatePresence } from "framer-motion";
import { MultiPackDisplay, MultiPackOpeningLoader } from '../packs/MultiPackDisplay';
import { ConsolidatedKOLGrid } from '../packs/MultiPackKOLGrid';

interface PackOpeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  userTP: number;
}

const PACK_TYPES = {
  PRO: {
    name: 'Pro Pack',
    price: 125,
    shares: '5-9 Shares PP',
    bgColor: 'bg-neutral-800',
    logoColor: 'text-white',
    labelColor: 'text-neutral-400'
  },
  EPIC: {
    name: 'Epic Pack',
    price: 500,
    shares: '20-38 Shares PP',
    bgColor: 'bg-neutral-900',
    logoColor: 'text-yellow-500',
    labelColor: 'text-neutral-400'
  },
  LEGENDARY: {
    name: 'Legendary Pack',
    price: 2000,
    shares: '204-379 Shares PP',
    bgColor: 'bg-neutral-800',
    logoColor: 'text-blue-400',
    labelColor: 'text-neutral-400'
  }
} as const;

type PackType = keyof typeof PACK_TYPES;

// Shield SVG Component
const ShieldLogo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 100 120" className={className} fill="currentColor">
    <path d="M50 10 L50 10 C30 10 20 15 10 20 L10 50 C10 80 30 100 50 110 C70 100 90 80 90 50 L90 20 C80 15 70 10 50 10 Z M50 25 L65 40 L50 40 L50 70 L35 55 L50 55 L50 25 Z" />
  </svg>
);

export function PackOpeningModal({ isOpen, onClose, userTP: initialTP }: PackOpeningModalProps) {
  const [selectedPack, setSelectedPack] = useState<PackType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<"selection" | "pack" | "loading" | "revealed">("selection");
  const [packData, setPackData] = useState<MultiPackRevealResponse["data"] | null>(null);
  const [numberOfPacks, setNumberOfPacks] = useState(0);
  const [userTP, setUserTP] = useState(initialTP);
  const { wallets } = useSolanaWallets();

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const userWallet = embeddedWallet?.address;

  // Fetch latest TP when modal opens
  useEffect(() => {
    if (isOpen && userWallet) {
      fetchLatestTP();
    }
  }, [isOpen, userWallet]);

  const fetchLatestTP = async () => {
    if (!userWallet) return;

    try {
      console.log('🔄 Fetching latest TP for wallet:', userWallet);
      const response = await fetch(`/api/getUserTotalTP?userWallet=${userWallet}`);
      const data = await response.json();

      console.log('📊 Received TP data:', data);

      if (data.success && typeof data.totalTP === 'number') {
        console.log('✅ Updating TP from', userTP, 'to', data.totalTP);
        setUserTP(data.totalTP);
      }
    } catch (error) {
      console.error('❌ Failed to fetch latest TP:', error);
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen || currentStep !== 'selection') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentStep]);

  const getMaxPacks = (packType: PackType) => {
    return Math.floor(userTP / PACK_TYPES[packType].price);
  };

  const handlePackSelection = (packType: PackType) => {
    const maxPacks = getMaxPacks(packType);
    if (maxPacks > 0) {
      setSelectedPack(packType);
    }
  };

  const handleOpenPacks = async () => {
    if (!selectedPack || !userWallet) return;

    const maxPacks = getMaxPacks(selectedPack);
    if (maxPacks < 1) {
      console.error('Not enough TP to open packs');
      return;
    }

    setIsProcessing(true);

    try {
      console.log(`🎁 Opening ${maxPacks} ${selectedPack} pack(s)...`);

      const response = await fetch('/api/pack/openPacksWithTP', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWallet,
          packType: selectedPack,
          numberOfPacks: maxPacks
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ TP deducted successfully:', result.data);

        // Refresh TP to show updated balance
        await fetchLatestTP();

        setNumberOfPacks(maxPacks);
        setCurrentStep('pack');
      } else {
        console.error('❌ Failed to open packs:', result.error);
        alert(result.error || 'Failed to open packs');
      }
    } catch (error) {
      console.error('❌ Error opening packs:', error);
      alert('An error occurred while opening packs');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevealPacks = async () => {
    setCurrentStep('loading');

    try {
      // Step 1: Reveal all packs
      const response = await fetch("/api/pack/revealAllPacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numberOfPacks }),
      });

      if (response.ok) {
        const result: MultiPackRevealResponse = await response.json();
        if (result.success) {
          setPackData(result.data);

          // Step 2: Automatically claim all KOL tokens
          if (!wallets || wallets.length === 0) {
            throw new Error("No wallet found for claiming tokens");
          }

          const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
          if (!embeddedWallet) {
            throw new Error("No embedded wallet found for claiming tokens");
          }

          // Call backend API to claim all tokens
          const claimResponse = await fetch("/api/pack/claimAllKOLTokens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userPrivyWalletAddress: embeddedWallet.address,
              consolidatedKols: result.data.consolidatedKols,
            }),
          });

          const claimData = await claimResponse.json();

          if (!claimResponse.ok || !claimData.success) {
            console.error("Failed to claim tokens:", claimData.error);
            throw new Error(claimData.error || "Failed to claim tokens");
          }

          console.log("✅ Tokens claimed successfully:", claimData.data);

          // Show the revealed cards after claiming is complete
          setTimeout(() => {
            setCurrentStep('revealed');
          }, 3000);
        } else {
          throw new Error("Multi-pack reveal failed");
        }
      } else {
        throw new Error("Network error");
      }
    } catch (error) {
      console.error("Multi-pack reveal error:", error);
      alert('Failed to reveal packs');
      setCurrentStep('selection');
    }
  };

  const handleClose = () => {
    setCurrentStep('selection');
    setSelectedPack(null);
    setNumberOfPacks(0);
    setPackData(null);
    // Refresh TP when closing modal in case user wants to open more packs
    if (userWallet) {
      fetchLatestTP();
    }
    onClose();
  };

  if (currentStep !== 'selection') {
    return (
      <div className="fixed inset-0 z-50 bg-black overflow-hidden">
        <AnimatePresence mode="wait">
          {currentStep === "pack" && (
            <motion.div
              key="pack"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.5 }}
              className="h-full"
            >
              <MultiPackDisplay onOpenPack={handleRevealPacks} packCount={numberOfPacks} />
            </motion.div>
          )}

          {currentStep === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="h-full"
            >
              <MultiPackOpeningLoader packCount={numberOfPacks} />
            </motion.div>
          )}

          {currentStep === "revealed" && (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full w-full overflow-y-auto overscroll-contain"
            >
              <div className="w-full max-w-7xl mx-auto px-6 pt-6 pb-32">
                <button
                  onClick={handleClose}
                  className="fixed top-6 right-6 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>

                {/* <StatsSummary stats={packData?.stats!} /> */}
                <ConsolidatedKOLGrid kols={packData?.consolidatedKols || []} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-white overflow-y-auto overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <button
            onClick={handleClose}
            className="fixed top-4 right-4 z-50 p-2 rounded-full hover:bg-neutral-100 transition-colors"
          >
            <X className="w-6 h-6 text-neutral-600" />
          </button>

          <div className="min-h-screen flex items-center justify-center p-4 py-20 pb-32">
            <div className="w-full max-w-5xl my-8">
            {/* Header */}
            <div className="text-center mb-8 md:mb-12">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-600 flex items-center justify-center gap-2">
                <span>Tournament Points:</span>
                <span className="inline-flex items-center gap-2 bg-black text-white px-3 py-1 rounded-full text-xl font-medium">
                  <span className="w-5 h-5 bg-white text-black rounded-full flex items-center justify-center text-xs font-bold">TP</span>
                  <span>{Math.floor(userTP).toLocaleString()}</span>
                </span>
              </h1>
              <p className="text-neutral-400 text-sm font-light mt-4">
                Each pack contains 4 players
              </p>
            </div>

            {/* Pack Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-12 px-4">
              {(Object.keys(PACK_TYPES) as PackType[]).map((packType) => {
                const pack = PACK_TYPES[packType];
                const maxPacks = getMaxPacks(packType);
                const canAfford = maxPacks > 0;
                const isSelected = selectedPack === packType;

                return (
                  <motion.div
                    key={packType}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative"
                  >
                    <button
                      onClick={() => canAfford && handlePackSelection(packType)}
                      disabled={!canAfford}
                      className={`
                        relative w-full transition-all duration-200
                        ${canAfford ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-50'}
                        ${isSelected ? 'scale-105' : ''}
                      `}
                    >
                      {/* Pack Image Container */}
                      <div className="relative aspect-[2/3] mb-4 md:mb-6">
                        {/* Metallic Pack Wrapper Effect */}
                        <div className="absolute inset-0 bg-gradient-to-b from-neutral-300 via-neutral-200 to-neutral-300 rounded-lg overflow-hidden shadow-xl">
                          {/* Top Seal */}
                          <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-neutral-100 to-neutral-300 border-b border-neutral-400"></div>
                          
                          {/* Main Pack Body */}
                          <div className={`absolute inset-0 top-12 bottom-12 ${pack.bgColor} flex flex-col items-center justify-center`}>
                            {/* Logo */}
                            <ShieldLogo className={`w-24 h-24 mb-4 ${pack.logoColor}`} />

                            {/* Pack Type Label */}
                            <h3 className={`text-3xl font-bold tracking-tight font-mono ${pack.logoColor}`}>
                              {packType}
                            </h3>
                          </div>
                          
                          {/* Bottom Seal */}
                          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-neutral-100 to-neutral-300 border-t border-neutral-400"></div>
                        </div>

                        {/* Selection Ring */}
                        {isSelected && (
                          <motion.div
                            layoutId="selection-ring"
                            className="absolute -inset-1 border-4 border-black rounded-lg"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                          />
                        )}
                      </div>

                      {/* Pack Info */}
                      <div className="text-center space-y-2">
                        <h3 className={`text-xl font-medium ${isSelected ? 'text-black' : 'text-neutral-700'}`}>
                          {pack.name}
                        </h3>
                        <p className="text-neutral-500 text-sm">
                          {pack.shares}
                        </p>
                        
                        {/* Price Badge */}
                        <div className="flex items-center justify-center gap-2">
                          <div className="inline-flex items-center gap-1.5 bg-neutral-900 text-white px-4 py-2 rounded-full">
                            <span className="w-5 h-5 bg-white text-black rounded-full flex items-center justify-center text-xs font-bold">TP</span>
                            <span className="font-semibold">{pack.price === 2000 ? '5k' : pack.price.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Availability Status */}
                        {canAfford ? (
                          <p className="text-neutral-600 text-sm pt-2">
                            {maxPacks} {maxPacks === 1 ? 'pack' : 'packs'} available
                          </p>
                        ) : (
                          <p className="text-neutral-400 text-sm pt-2">
                            Not enough TP
                          </p>
                        )}
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>

            {/* Action Button */}
            <div className="max-w-2xl mx-auto px-4 pb-16">
              {selectedPack ? (
                <Button
                  onClick={handleOpenPacks}
                  disabled={isProcessing}
                  size="lg"
                  className="cursor-pointer w-full h-14 text-lg tracking-tight bg-black text-white hover:bg-neutral-800 rounded-full transition-all duration-200"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Opening...
                    </span>
                  ) : (
                    `Open ${getMaxPacks(selectedPack)} ${PACK_TYPES[selectedPack].name}${getMaxPacks(selectedPack) > 1 ? 's' : ''}`
                  )}
                </Button>
              ) : (
                <Button
                  disabled
                  size="lg"
                  className="w-full h-14 text-lg font-semibold bg-neutral-300 text-neutral-500 rounded-full cursor-not-allowed"
                >
                  Choose a pack
                </Button>
              )}
            </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}