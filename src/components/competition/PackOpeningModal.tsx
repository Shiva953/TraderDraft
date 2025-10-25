'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { X, Minus, Plus } from 'lucide-react';
import { MultiPackRevealResponse } from "@/types/pack";
import { motion, AnimatePresence } from "framer-motion";
import { MultiPackOpeningLoader } from '../packs/MultiPackDisplay';
import { ConsolidatedKOLGrid } from '../packs/MultiPackKOLGrid';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface PackOpeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  userTP: number;
  onPackOpenSuccess?: () => void;
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

export function PackOpeningModal({ isOpen, onClose, userTP: initialTP, onPackOpenSuccess }: PackOpeningModalProps) {
  const [selectedPack, setSelectedPack] = useState<PackType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<"selection" | "loading" | "revealed">("selection");
  const [packData, setPackData] = useState<MultiPackRevealResponse["data"] | null>(null);
  const [numberOfPacks, setNumberOfPacks] = useState(0);
  const [userTP, setUserTP] = useState(initialTP);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [customQuantity, setCustomQuantity] = useState(1);
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
      const response = await fetch(`/api/user/getUserTotalTP?userWallet=${userWallet}`);
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

  // Prevent body scroll when modal is open AND hide TestModeController
  useEffect(() => {
    if (isOpen || currentStep !== 'selection') {
      document.body.style.overflow = 'hidden';
      
      // Hide TestModeController when modal is fullscreen
      // Target all fixed elements at bottom-right with z-50 (TestModeController button/panel)
      const bottomRightElements = document.querySelectorAll('.fixed');
      bottomRightElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const classes = htmlEl.className;
        // Check if it has bottom-6, right-6, and z-50 OR if it's the TestMode help modal (z-[60])
        if ((classes.includes('bottom-6') && classes.includes('right-6') && classes.includes('z-50')) ||
            (classes.includes('z-[60]'))) {
          htmlEl.style.display = 'none';
        }
      });
    } else {
      document.body.style.overflow = 'unset';
      
      // Restore TestModeController
      const bottomRightElements = document.querySelectorAll('.fixed');
      bottomRightElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const classes = htmlEl.className;
        if ((classes.includes('bottom-6') && classes.includes('right-6') && classes.includes('z-50')) ||
            (classes.includes('z-[60]'))) {
          htmlEl.style.display = '';
        }
      });
    }

    return () => {
      document.body.style.overflow = 'unset';
      // Restore TestModeController on cleanup
      const bottomRightElements = document.querySelectorAll('.fixed');
      bottomRightElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const classes = htmlEl.className;
        if ((classes.includes('bottom-6') && classes.includes('right-6') && classes.includes('z-50')) ||
            (classes.includes('z-[60]'))) {
          htmlEl.style.display = '';
        }
      });
    };
  }, [isOpen, currentStep]);

  const getMaxPacks = (packType: PackType) => {
    return Math.floor(userTP / PACK_TYPES[packType].price);
  };

  const handlePackSelection = (packType: PackType) => {
    const maxPacks = getMaxPacks(packType);
    if (maxPacks > 0) {
      setSelectedPack(packType);
      setCustomQuantity(Math.min(1, maxPacks));
      // Don't open drawer here - let the button do it
    }
  };

  const handleQuantityChange = (change: number) => {
    if (!selectedPack) return;
    const maxPacks = getMaxPacks(selectedPack);
    const newQuantity = Math.max(1, Math.min(maxPacks, customQuantity + change));
    setCustomQuantity(newQuantity);
  };

  const handleOpenPacks = async () => {
    if (!selectedPack || !userWallet) return;

    const packsToOpen = customQuantity;
    if (packsToOpen < 1) {
      console.error('Not enough TP to open packs');
      return;
    }

    setIsProcessing(true);

    // Small delay to show loading state in button before closing drawer
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsDrawerOpen(false);

    try {
      console.log(`🎁 Opening ${packsToOpen} ${selectedPack} pack(s)...`);

      const response = await fetch('/api/pack/openPacksWithTP', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWallet,
          packType: selectedPack,
          numberOfPacks: packsToOpen
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ TP deducted successfully:', result.data);

        // Refresh TP to show updated balance
        await fetchLatestTP();

        setNumberOfPacks(packsToOpen);
        
        // Go directly to loading/revealing step instead of showing pack display
        handleRevealPacks(packsToOpen);
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

  const handleRevealPacks = async (packsToReveal: number) => {
    setCurrentStep('loading');

    try {
      if (!userWallet) {
        throw new Error("No wallet found");
      }

      console.log(`🎁 Revealing ${packsToReveal} packs for wallet: ${userWallet}`);

      // Step 1: Reveal all packs (now stored in database)
      const response = await fetch("/api/pack/revealAllPacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numberOfPacks: packsToReveal,
          userPublicKey: userWallet // ✅ Pass wallet address
        }),
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

          // Notify parent to refresh user data
          if (onPackOpenSuccess) {
            onPackOpenSuccess();
          }

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
    setIsDrawerOpen(false);
    setCustomQuantity(1);
    // Refresh TP when closing modal in case user wants to open more packs
    if (userWallet) {
      fetchLatestTP();
    }
    onClose();
  };

  if (currentStep !== 'selection') {
    const modalContent = (
      <div className="fixed inset-0 z-[9999] bg-black overflow-hidden">
        <AnimatePresence mode="wait">
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
              <div className="w-full min-h-screen">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-48">
                  <button
                    onClick={handleClose}
                    className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>

                  {/* <StatsSummary stats={packData?.stats!} /> */}
                  <ConsolidatedKOLGrid kols={packData?.consolidatedKols || []} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
    
    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
  }

  if (!isOpen) return null;

  const selectionModal = (
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

          <div className="min-h-screen flex items-start justify-center p-4 pb-40">
            <div className="w-full max-w-5xl my-6">
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
                      <div className="relative aspect-[2/2.52] mb-4 md:mb-6">
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
                        {/* <p className="text-neutral-500 text-sm">
                          // {pack.shares}
                        </p> */}
                        
                        {/* Price Badge */}
                        <div className="flex items-center justify-center gap-2">
                          <div className="inline-flex items-center gap-1.5 bg-neutral-900 text-white px-4 py-2 rounded-full">
                            <span className="w-5 h-5 bg-white text-black rounded-full flex items-center justify-center text-xs font-bold">TP</span>
                            <span className="font-semibold">{pack.price === 2000 ? '5k' : pack.price.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>

            {/* Drawer for Quantity Selection */}
            <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
              <DrawerContent className="bg-white !z-[10000]">
                <DrawerHeader className="text-center">
                  <DrawerTitle className="text-2xl font-bold text-neutral-900">
                    {selectedPack && PACK_TYPES[selectedPack].name}
                  </DrawerTitle>
                  <DrawerDescription className="text-neutral-600">
                    Select the number of packs to open
                  </DrawerDescription>
                </DrawerHeader>

                <div className="px-6 py-8 overflow-y-auto flex-1">
                  <div className="flex items-center justify-center gap-6">
                    <Button
                      onClick={() => handleQuantityChange(-1)}
                      disabled={customQuantity <= 1}
                      size="lg"
                      variant="outline"
                      className="h-14 w-14 rounded-full border-2 border-neutral-300 hover:border-neutral-900"
                    >
                      <Minus className="h-6 w-6" />
                    </Button>

                    <div className="text-center min-w-[120px]">
                      <div className="text-5xl font-bold text-neutral-900">{customQuantity}</div>
                      <div className="text-sm text-neutral-500 mt-1">
                        {selectedPack && `${customQuantity * PACK_TYPES[selectedPack].price} TP`}
                      </div>
                    </div>

                    <Button
                      onClick={() => handleQuantityChange(1)}
                      disabled={selectedPack ? customQuantity >= getMaxPacks(selectedPack) : true}
                      size="lg"
                      variant="outline"
                      className="h-14 w-14 rounded-full border-2 border-neutral-300 hover:border-neutral-900"
                    >
                      <Plus className="h-6 w-6" />
                    </Button>
                  </div>

                  <div className="mt-6 text-center text-sm text-neutral-500">
                    Maximum: {selectedPack && getMaxPacks(selectedPack)} packs
                  </div>
                </div>

                <DrawerFooter className="px-6 pb-12 pt-4 flex flex-col items-center gap-3 shrink-0">
                  <Button
                    onClick={handleOpenPacks}
                    disabled={isProcessing}
                    size="lg"
                    className="cursor-pointer max-w-md w-full h-14 text-lg tracking-tight bg-black text-white hover:bg-neutral-800 rounded-full"
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Opening...
                      </span>
                    ) : (
                      `Open ${customQuantity} Pack${customQuantity > 1 ? 's' : ''}`
                    )}
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="outline" size="lg" className="max-w-md w-full">
                      Cancel
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>

            {/* Action Button - Click to Open Drawer */}
            <div className="max-w-2xl mx-auto px-4 pb-24">
              {selectedPack ? (
                <Button
                  onClick={() => setIsDrawerOpen(true)}
                  disabled={isProcessing}
                  size="lg"
                  className="cursor-pointer w-full h-14 text-lg tracking-tight bg-black text-white hover:bg-neutral-800 rounded-full transition-all duration-200"
                >
                  Select amount of {PACK_TYPES[selectedPack].name}s...
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

          {/* Loading Overlay - Show while processing after drawer closes */}
          {isProcessing && !isDrawerOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10001] bg-white/95 flex items-center justify-center"
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-3 h-3 bg-black rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-3 h-3 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className="text-neutral-600 font-medium">Preparing your packs...</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(selectionModal, document.body) : null;
}