import React, { useState, useRef, useId, useEffect } from "react";
import { motion, AnimatePresence, useAnimate } from "framer-motion";

// Types
interface KOLData {
  slot: string;
  name: string;
  ticker: string;
  address: string;
  tokenMintAddress: string;
  pnl: string;
  winRate: number;
  avatarUrl: string;
  xUrl: string;
  rank: number;
  tokenPrice: number;
  tokensReceived: string;
  estimatedValueSOL: number;
  estimatedValueUSD: number;
  transferSignature: string;
}

interface PackRevealResponse {
  success: boolean;
  data: {
    packId: string;
    revealedAt: string;
    kols: KOLData[];
    stats: {
      totalKols: number;
      totalTokensReceived: number;
      totalEstimatedValueSOL: number;
      totalEstimatedValueUSD: number;
      avgWinRate: number;
      totalPnl: number;
    };
  };
}

// Pack Banner Component
export const PackRevealBanner = ({ onRevealClick }: { onRevealClick: () => void }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900 p-8 text-white">
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative z-10 flex items-center justify-between">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Pack Reveal Now Live</h1>
          <p className="text-xl text-gray-200">Discover which KOL tokens await you</p>
          <motion.button
            onClick={onRevealClick}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-3 font-semibold text-white shadow-lg hover:shadow-rose-500/30 transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Reveal Your Packs
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </motion.button>
        </div>
        <div className="flex space-x-4">
          <div className="relative">
            <div className="h-32 w-24 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 transform rotate-12" />
            <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
              MYSTERY
              <br />
              PACK
            </div>
          </div>
          <div className="relative">
            <div className="h-32 w-24 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 transform -rotate-6" />
            <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
              MYSTERY
              <br />
              PACK
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};