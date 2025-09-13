'use client';

import { useState } from 'react';
import BuyPackModal from './BuyPackModal';

export default function PackSaleBanner() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">
                Pack Sale Live! 🎁
              </h2>
              <p className="text-neutral-300">
                Buy packs to get exclusive trader tokens. Each pack contains 0.1 SOL worth of tokens.
              </p>
              <div className="flex items-center gap-4 text-sm text-neutral-400">
                <span>Price: 0.1 SOL per pack</span>
                <span>•</span>
                <span>Limited time offer</span>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="group relative flex items-center justify-center gap-3 rounded-full px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 transition-all duration-200 hover:shadow-purple-500/50 focus:outline-none focus:ring-4 focus:ring-purple-400/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <span>Buy Packs</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <BuyPackModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
