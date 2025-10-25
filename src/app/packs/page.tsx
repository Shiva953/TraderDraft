'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { X, Minus, Plus } from 'lucide-react';
import { MultiPackRevealResponse } from "@/types/pack";
import { motion, AnimatePresence } from "framer-motion";
import { MultiPackOpeningLoader } from '@/components/packs/MultiPackDisplay';
import { ConsolidatedKOLGrid } from '@/components/packs/MultiPackKOLGrid';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const PACK_TYPES = {
  PRO: {
    name: 'Pro Pack',
    price: 125,
    bgColor: 'bg-neutral-800',
    logoColor: 'text-white',
    labelColor: 'text-neutral-400'
  },
  EPIC: {
    name: 'Epic Pack',
    price: 500,
    bgColor: 'bg-neutral-900',
    logoColor: 'text-yellow-500',
    labelColor: 'text-neutral-400'
  },
  LEGENDARY: {
    name: 'Legendary Pack',
    price: 2000,
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

export default function PacksPage() {
  const [selectedPack, setSelectedPack] = useState<PackType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<"selection" | "loading" | "revealed">("selection");
  const [packData, setPackData] = useState<MultiPackRevealResponse["data"] | null>(null);
  const [numberOfPacks, setNumberOfPacks] = useState(0);
  const [userTP, setUserTP] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [customQuantity, setCustomQuantity] = useState(1);
  const { wallets } = useSolanaWallets();

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const userWallet = embeddedWallet?.address;

  // Fetch user TP on mount
  useEffect(() => {
    if (userWallet) {
      fetchLatestTP();
    }
  }, [userWallet]);

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

  const getMaxPacks = (packType: PackType) => {
    return Math.floor(userTP / PACK_TYPES[packType].price);
  };

  const handlePackSelection = (packType: PackType) => {
    const maxPacks = getMaxPacks(packType);
    if (maxPacks > 0) {
      setSelectedPack(packType);
      setCustomQuantity(Math.min(1, maxPacks));
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

    await new Promise(resolve => setTimeout(resolve, 300));
    setIsDrawerOpen(false);

    // Show "Revealing..." modal overlay immediately
    setNumberOfPacks(packsToOpen);
    setCurrentStep('loading');

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
        await fetchLatestTP();
        handleRevealPacks(packsToOpen);
      } else {
        console.error('❌ Failed to open packs:', result.error);
        alert(result.error || 'Failed to open packs');
        // Reset to selection if error
        setCurrentStep('selection');
      }
    } catch (error) {
      console.error('❌ Error opening packs:', error);
      alert('An error occurred while opening packs');
      // Reset to selection if error
      setCurrentStep('selection');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevealPacks = async (packsToReveal: number) => {
    // Loading state already set by handleOpenPacks, continue with reveal API call

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
          userPublicKey: userWallet
        }),
      });

      if (response.ok) {
        const result: MultiPackRevealResponse = await response.json();
        console.log("🎁 Pack reveal result:", result);
        console.log("📦 Pack data:", result.data);
        console.log("👥 Consolidated KOLs:", result.data?.consolidatedKols);

        if (result.success) {
          setPackData(result.data);

          // Step 2: Automatically claim all KOL tokens
          const claimResponse = await fetch("/api/pack/claimAllKOLTokens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userPrivyWalletAddress: userWallet,
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
        const errorData = await response.json();
        console.error("❌ Pack reveal API error:", errorData);
        throw new Error(errorData.error || "Network error");
      }
    } catch (error) {
      console.error("Multi-pack reveal error:", error);
      alert(`Failed to reveal packs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCurrentStep('selection');
    }
  };

  const handleReset = () => {
    setCurrentStep('selection');
    setSelectedPack(null);
    setNumberOfPacks(0);
    setPackData(null);
    setIsDrawerOpen(false);
    setCustomQuantity(1);
    fetchLatestTP();
  };

  if (!userWallet) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-neutral-400">Please connect your wallet to open packs</p>
        </div>
      </div>
    );
  }

  // Render fullscreen modal for loading and revealed states using portal
  const fullscreenModal = (currentStep === 'loading' || currentStep === 'revealed') && typeof document !== 'undefined' ? (
    createPortal(
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

          {currentStep === "revealed" && packData && (
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
                    onClick={handleReset}
                    className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm cursor-pointer"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>

                  <ConsolidatedKOLGrid kols={packData.consolidatedKols || []} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>,
      document.body
    )
  ) : null;

  return (
    <>
      <div className="min-h-screen bg-black">
        <AnimatePresence mode="wait">
          {currentStep === "selection" && (
            <motion.div
              key="selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen flex flex-col items-center justify-start pt-24 p-4"
            >
              {/* TP Display */}
              <div className="absolute top-24 right-8 bg-neutral-900 px-6 py-3 rounded-lg border border-neutral-700">
                <div className="text-sm text-neutral-400">Tournament Points</div>
                <div className="text-2xl font-bold text-white">{userTP.toLocaleString()} TP</div>
              </div>

              <h1 className="text-4xl font-bold text-white mb-8">Choose Your Pack</h1>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
              {(Object.keys(PACK_TYPES) as PackType[]).map((packType) => {
                const pack = PACK_TYPES[packType];
                const maxPacks = getMaxPacks(packType);
                const canAfford = maxPacks > 0;

                return (
                  <div
                    key={packType}
                    className={`${pack.bgColor} rounded-2xl p-8 border-2 ${
                      selectedPack === packType ? 'border-white' : 'border-neutral-700'
                    } ${canAfford ? 'cursor-pointer hover:border-neutral-500' : 'opacity-50 cursor-not-allowed'} transition-all`}
                    onClick={() => canAfford && handlePackSelection(packType)}
                  >
                    <div className="flex flex-col items-center">
                      <ShieldLogo className={`w-24 h-24 ${pack.logoColor} mb-4`} />
                      <h3 className="text-2xl font-bold text-white mb-4">{pack.name}</h3>
                      <div className="text-3xl font-bold text-white mb-2">{pack.price} TP</div>
                      <div className="text-sm text-neutral-400 mb-6">
                        Max: {maxPacks} {maxPacks === 1 ? 'pack' : 'packs'}
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canAfford) {
                            handlePackSelection(packType);
                            setIsDrawerOpen(true);
                          }
                        }}
                        disabled={!canAfford}
                        className="w-full cursor-pointer bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed"
                      >
                        {canAfford ? 'Select' : 'Insufficient TP'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quantity Drawer */}
            <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
              <DrawerContent className="bg-neutral-900 border-neutral-700">
                <DrawerHeader>
                  <DrawerTitle className="text-white">
                    {selectedPack && PACK_TYPES[selectedPack].name}
                  </DrawerTitle>
                  <DrawerDescription className="text-neutral-400">
                    Select how many packs you want to open
                  </DrawerDescription>
                </DrawerHeader>

                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      onClick={() => handleQuantityChange(-1)}
                      disabled={customQuantity <= 1}
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>

                    <div className="text-4xl font-bold text-white w-24 text-center">
                      {customQuantity}
                    </div>

                    <Button
                      onClick={() => handleQuantityChange(1)}
                      disabled={selectedPack ? customQuantity >= getMaxPacks(selectedPack) : true}
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="text-neutral-400 text-sm">
                      Total Cost: {selectedPack && (customQuantity * PACK_TYPES[selectedPack].price).toLocaleString()} TP
                    </div>
                    <div className="text-neutral-400 text-sm">
                      Remaining: {selectedPack && (userTP - (customQuantity * PACK_TYPES[selectedPack].price)).toLocaleString()} TP
                    </div>
                  </div>
                </div>

                <DrawerFooter>
                  <Button
                    onClick={handleOpenPacks}
                    disabled={isProcessing}
                    className="w-full cursor-pointer bg-white text-black hover:bg-neutral-200 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Processing...' : `Open ${customQuantity} ${customQuantity === 1 ? 'Pack' : 'Packs'}`}
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="outline" className="w-full cursor-pointer">
                      Cancel
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* Fullscreen modal portal for loading and revealed states */}
      {fullscreenModal}
    </>
  );
}
