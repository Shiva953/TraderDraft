import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/app/hooks/useWallet";
import { useUserPacks } from "@/app/hooks/useUserPacks";
import { useApi } from "@/app/hooks/useApi";
import { MultiPackRevealBanner } from "./MultiPackRevealBanner";
import { MultiPackDisplay, MultiPackOpeningLoader } from "./MultiPackDisplay";
import { StatsSummary } from "./StatsSummary";
import { ConsolidatedKOLGrid, MultiPackRevealResponse } from "./MultiPackKOLGrid";
import { ClaimAllTokensButton } from "./ClaimAllKOLPacksTokens";

type RevealStep = "banner" | "pack" | "loading" | "revealed";

export const MultiPackRevealSystem = () => {
  const [currentStep, setCurrentStep] = useState<RevealStep>("banner");
  const [packData, setPackData] = useState<MultiPackRevealResponse["data"] | null>(null);
  
  const { fullAddress, isConnected } = useWallet();
  const { data: userPacksData, refresh: refreshUserPacks } = useUserPacks();
  
  const { execute: revealPacks, loading: isRevealing } = useApi<MultiPackRevealResponse['data']>('/api/pack/revealAllPacks');
  const { execute: resetPackHoldings } = useApi('/api/pack/resetUserPackHoldings');

  const packCount = userPacksData?.packHoldings || 0;

  const handleRevealClick = useCallback(() => {
    setCurrentStep("pack");
  }, []);

  const handleOpenPack = useCallback(async () => {
    if (!packCount || !isConnected) return;

    setCurrentStep("loading");

    try {
      const result = await revealPacks({ numberOfPacks: packCount });
      
      if (result) {
        setPackData(result);
        
        // Reset user pack holdings
        await resetPackHoldings({ userPrivyWalletAddress: fullAddress });
        
        // Refresh user data
        await refreshUserPacks();
        
        setTimeout(() => {
          setCurrentStep("revealed");
        }, 3000);
      }
    } catch (error) {
      console.error("Multi-pack reveal error:", error);
      // Could add error state handling here
      setCurrentStep("pack"); // Go back to pack step on error
    }
  }, [packCount, isConnected, revealPacks, resetPackHoldings, fullAddress, refreshUserPacks]);

  const handlePackClaim = useCallback(async () => {
    console.log("Token claim initiated - backend will handle transfers directly!");
    
    if (!packData || !fullAddress) {
      console.error("Missing pack data or wallet for claiming");
      return;
    }

    // Additional claiming logic can be added here
  }, [packData, fullAddress]);

  // Memoized step components to prevent unnecessary re-renders
  const stepComponents = {
    banner: (
      <MultiPackRevealBanner 
        onRevealClick={handleRevealClick} 
        packCount={packCount} 
      />
    ),
    pack: (
      <MultiPackDisplay 
        onOpenPack={handleOpenPack} 
        packCount={packCount}
      />
    ),
    loading: (
      <MultiPackOpeningLoader packCount={packCount} />
    ),
    revealed: (
      <div className="w-full max-w-7xl mx-auto p-6">
        <StatsSummary stats={packData?.stats!} />
        <ConsolidatedKOLGrid kols={packData?.consolidatedKols || []} />
        <ClaimAllTokensButton packData={packData} onClaim={handlePackClaim} />
      </div>
    ),
  };

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: currentStep === 'revealed' ? 0 : 50 }}
          animate={{ opacity: 1, y: 0, scale: currentStep === 'revealed' ? 1 : 1 }}
          exit={{ opacity: 0, y: currentStep === 'revealed' ? 0 : -50 }}
          transition={{ 
            duration: currentStep === 'revealed' ? 0.7 : 0.5,
            ease: currentStep === 'revealed' ? "easeOut" : "easeInOut"
          }}
          className={currentStep === 'revealed' ? 'min-h-screen' : 'h-full'}
        >
          {stepComponents[currentStep]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default MultiPackRevealSystem;