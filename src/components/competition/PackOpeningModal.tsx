'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { X } from 'lucide-react';
import { MultiPackRevealResponse } from "@/types/pack";
import { motion, AnimatePresence } from "framer-motion";
import { MultiPackDisplay, MultiPackOpeningLoader } from '../packs/MultiPackDisplay';
import { StatsSummary } from '../packs/StatsSummary';
import { ConsolidatedKOLGrid } from '../packs/MultiPackKOLGrid';
import { ClaimAllTokensButton } from '../packs/ClaimAllKOLPacksTokens';
import { BackgroundGradient } from '@/components/ui/background-gradient';

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
    gradient: 'from-slate-400 via-slate-200 to-slate-400',
    bgGradient: 'bg-gradient-to-br from-slate-900/50 via-slate-800/30 to-slate-900/50',
    borderColor: 'border-slate-400/30',
    hoverBorder: 'hover:border-slate-300',
    textColor: 'text-slate-100',
    glowColor: 'shadow-slate-500/50'
  },
  EPIC: {
    name: 'Epic Pack',
    price: 500,
    shares: '20-38 Shares PP',
    gradient: 'from-yellow-600 via-yellow-400 to-yellow-600',
    bgGradient: 'bg-gradient-to-br from-yellow-900/50 via-yellow-800/30 to-yellow-900/50',
    borderColor: 'border-yellow-400/30',
    hoverBorder: 'hover:border-yellow-300',
    textColor: 'text-yellow-100',
    glowColor: 'shadow-yellow-500/50'
  },
  LEGENDARY: {
    name: 'Legendary Pack',
    price: 2000,
    shares: '204-379 Shares PP',
    gradient: 'from-cyan-400 via-blue-200 to-cyan-400',
    bgGradient: 'bg-gradient-to-br from-cyan-900/50 via-blue-900/30 to-cyan-900/50',
    borderColor: 'border-cyan-400/30',
    hoverBorder: 'hover:border-cyan-300',
    textColor: 'text-cyan-100',
    glowColor: 'shadow-cyan-500/50'
  }
} as const;

type PackType = keyof typeof PACK_TYPES;

export function PackOpeningModal({ isOpen, onClose, userTP }: PackOpeningModalProps) {
  const [selectedPack, setSelectedPack] = useState<PackType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<"selection" | "pack" | "loading" | "revealed">("selection");
  const [packData, setPackData] = useState<MultiPackRevealResponse["data"] | null>(null);
  const [numberOfPacks, setNumberOfPacks] = useState(0);
  const { wallets } = useSolanaWallets();

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const userWallet = embeddedWallet?.address;

  // Calculate how many packs can be opened for each type
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

      // Deduct TP from user
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

        // Store the number of packs and move to pack display
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
      const response = await fetch("/api/pack/revealAllPacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numberOfPacks }),
      });

      if (response.ok) {
        const result: MultiPackRevealResponse = await response.json();
        if (result.success) {
          setPackData(result.data);

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

  const handlePackClaim = async () => {
    console.log("Token claim initiated - backend will handle transfers directly!");

    if (!packData || !wallets || wallets.length === 0) {
      console.error("Missing pack data or wallet for claiming");
      return;
    }

    const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
    if (!embeddedWallet) {
      console.error("No embedded wallet found");
      return;
    }
  };

  const handleClose = () => {
    setCurrentStep('selection');
    setSelectedPack(null);
    setNumberOfPacks(0);
    setPackData(null);
    onClose();
  };

  // If we're in pack reveal stages, show full screen
  if (currentStep !== 'selection') {
    return (
      <div className="fixed inset-0 z-50 bg-black">
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
              className="min-h-screen"
            >
              <div className="w-full max-w-7xl mx-auto p-6">
                <StatsSummary stats={packData?.stats!} />
                <ConsolidatedKOLGrid kols={packData?.consolidatedKols || []} />
                <ClaimAllTokensButton packData={packData} onClaim={handlePackClaim} />

                <div className="flex justify-center mt-8">
                  <Button
                    onClick={handleClose}
                    size="lg"
                    className="bg-white text-black hover:bg-neutral-200 font-bold px-12"
                  >
                    Close
                  </Button>
                </div>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 md:top-8 md:right-8 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors group"
          >
            <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
          </button>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[98vw] max-h-[95vh] flex flex-col items-center justify-center overflow-y-auto"
          >
            {/* Header */}
            <motion.div
              className="text-center mb-8 md:mb-12"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-2 md:mb-4 tracking-tight">
                TOURNAMENT POINTS BALANCE: <span className="text-emerald-400">{Math.floor(userTP)}</span>
              </h1>
              <p className="text-neutral-400 text-base md:text-lg font-light">
                Each pack contains 4 players
              </p>
            </motion.div>

            {/* Pack Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 lg:gap-12 w-full max-w-7xl mb-8 md:mb-12 px-4">
              {(Object.keys(PACK_TYPES) as PackType[]).map((packType, index) => {
                const pack = PACK_TYPES[packType];
                const maxPacks = getMaxPacks(packType);
                const canAfford = maxPacks > 0;
                const isSelected = selectedPack === packType;

                return (
                  <motion.div
                    key={packType}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="relative"
                  >
                    <BackgroundGradient
                      containerClassName={`rounded-3xl ${!canAfford ? 'opacity-50' : ''}`}
                      animate={isSelected}
                    >
                      <button
                        onClick={() => canAfford && handlePackSelection(packType)}
                        disabled={!canAfford}
                        className={`
                          relative w-full h-full rounded-3xl p-6 md:p-8
                          ${pack.bgGradient}
                          border-2 ${isSelected ? 'border-white' : pack.borderColor}
                          ${canAfford ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}
                          transition-all duration-300
                          ${isSelected ? `shadow-2xl ${pack.glowColor}` : ''}
                          group
                        `}
                      >
                        {/* Pack Image */}
                        <div className="relative w-full aspect-[3/4] mb-4 md:mb-6 flex items-center justify-center">
                          <div className={`
                            absolute inset-0 bg-gradient-to-b ${pack.gradient} opacity-20 blur-3xl
                            group-hover:opacity-30 transition-opacity duration-300
                          `} />
                          <div className="relative w-full h-full flex items-center justify-center">
                            <div className={`
                              w-3/4 h-full rounded-2xl bg-gradient-to-b ${pack.gradient}
                              shadow-2xl flex items-center justify-center
                              group-hover:scale-105 transition-transform duration-300
                            `}>
                              <div className="text-center">
                                <div className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-3 md:mb-4 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                  <span className="text-3xl md:text-5xl font-bold text-white">🎁</span>
                                </div>
                                <div className={`text-2xl md:text-4xl font-black ${pack.textColor} tracking-wider`}>
                                  {packType}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Pack Info */}
                        <div className="text-center space-y-2 md:space-y-3">
                          <h3 className="text-xl md:text-2xl font-bold text-white">
                            {pack.name}
                          </h3>
                          <p className="text-neutral-400 text-xs md:text-sm">
                            {pack.shares}
                          </p>
                          <div className="flex items-center justify-center gap-2 text-white font-bold text-lg md:text-xl">
                            <div className="w-5 h-5 md:w-6 md:h-6 bg-white rounded-full flex items-center justify-center">
                              <span className="text-black text-[10px] md:text-xs font-bold">TP</span>
                            </div>
                            {pack.price === 2000 ? '2k' : pack.price}
                          </div>

                          {/* Affordability Indicator */}
                          {canAfford && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="mt-3 md:mt-4 p-2 md:p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30"
                            >
                              <p className="text-emerald-400 font-bold text-base md:text-lg">
                                {maxPacks} {maxPacks === 1 ? 'pack' : 'packs'} available
                              </p>
                            </motion.div>
                          )}

                          {!canAfford && (
                            <div className="mt-3 md:mt-4 p-2 md:p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                              <p className="text-red-400 font-semibold text-xs md:text-sm">
                                Not enough TP
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Selection Indicator */}
                        {isSelected && (
                          <motion.div
                            layoutId="selected-indicator"
                            className="absolute -top-2 -right-2 md:-top-3 md:-right-3 w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center shadow-lg"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          >
                            <div className="w-5 h-5 md:w-6 md:h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </motion.div>
                        )}
                      </button>
                    </BackgroundGradient>
                  </motion.div>
                );
              })}
            </div>

            {/* Action Button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="w-full max-w-md px-4"
            >
              {selectedPack ? (
                <Button
                  onClick={handleOpenPacks}
                  disabled={isProcessing}
                  size="lg"
                  className="w-full h-14 md:h-16 text-lg md:text-xl font-bold bg-white text-black hover:bg-neutral-200 rounded-2xl shadow-2xl hover:shadow-white/20 transition-all duration-300"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
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
                  className="w-full h-14 md:h-16 text-lg md:text-xl font-bold bg-neutral-800 text-neutral-500 rounded-2xl cursor-not-allowed"
                >
                  Choose a pack
                </Button>
              )}

              {selectedPack && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-neutral-500 text-xs md:text-sm mt-3 md:mt-4"
                >
                  This will deduct {getMaxPacks(selectedPack) * PACK_TYPES[selectedPack].price} TP from your balance
                </motion.p>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
