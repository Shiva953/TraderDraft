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

interface KOLCardProps {
    kol: KOLData;
    index: number;
    current: number;
    handleCardClick: (index: number) => void;
  }
  
  const KOLCard = ({ kol, index, current, handleCardClick }: KOLCardProps) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const xRef = useRef(0);
    const yRef = useRef(0);
    const frameRef = useRef<number>(0);
  
    useEffect(() => {
      const animate = () => {
        if (!cardRef.current) return;
        const x = xRef.current;
        const y = yRef.current;
        cardRef.current.style.setProperty("--x", `${x}px`);
        cardRef.current.style.setProperty("--y", `${y}px`);
        frameRef.current = requestAnimationFrame(animate);
      };
      frameRef.current = requestAnimationFrame(animate);
      return () => {
        if (frameRef.current) {
          cancelAnimationFrame(frameRef.current);
        }
      };
    }, []);
  
    const handleMouseMove = (event: React.MouseEvent) => {
      const el = cardRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      xRef.current = event.clientX - (r.left + Math.floor(r.width / 2));
      yRef.current = event.clientY - (r.top + Math.floor(r.height / 2));
    };
  
    const handleMouseLeave = () => {
      xRef.current = 0;
      yRef.current = 0;
    };
  
    return (
      <div className="[perspective:1200px] [transform-style:preserve-3d]">
        <div
          ref={cardRef}
          className="relative w-[70vmin] h-[70vmin] mx-[4vmin] cursor-pointer transition-all duration-300 ease-in-out"
          onClick={() => handleCardClick(index)}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: current !== index ? "scale(0.9) rotateX(8deg)" : "scale(1) rotateX(0deg)",
            opacity: current !== index ? 0.7 : 1,
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-gray-700 overflow-hidden"
            style={{
              transform: current === index ? "translate3d(calc(var(--x) / 30), calc(var(--y) / 30), 0)" : "none",
            }}
          >
            {kol.avatarUrl && (
              <div className="absolute inset-0 opacity-20">
                <img
                  src={kol.avatarUrl}
                  alt={kol.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {current === index && <div className="absolute inset-0 bg-black/60" />}
          </div>
  
          <div className={`relative p-8 h-full flex flex-col justify-center items-center text-center transition-opacity duration-500 ${current === index ? "opacity-100" : "opacity-0"}`}>
            <div className="space-y-6">
              {kol.avatarUrl && (
                <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-4 border-purple-500">
                  <img
                    src={kol.avatarUrl}
                    alt={kol.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <h2 className="text-3xl font-bold text-white">{kol.name}</h2>
              <div className="text-purple-400 font-semibold text-lg">#{kol.rank}</div>
              
              <div className="space-y-3">
                <div className="text-green-400 font-bold text-xl">{kol.pnl}</div>
                <div className="text-gray-300">Win Rate: {kol.winRate.toFixed(2)}%</div>
                <div className="text-sm text-gray-400">{(Number(kol.tokensReceived)/1000000).toString()} tokens</div>
              </div>
  
              <div className="flex space-x-3">
                {kol.xUrl && (
                  <a
                    href={kol.xUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    Twitter
                  </a>
                )}
                <a
                  href={`https://solscan.io/token/${kol.tokenMintAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  View Token
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CarouselControl = ({ 
    direction, 
    onClick 
  }: { 
    direction: 'prev' | 'next'; 
    onClick: () => void; 
  }) => {
    return (
      <motion.button
        onClick={onClick}
        className="w-12 h-12 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-white hover:bg-gray-700 transition-colors duration-200"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <svg
          className={`w-6 h-6 ${direction === 'prev' ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </motion.button>
    );
  };

  export const KOLCarousel = ({ kols }: { kols: KOLData[] }) => {
    const [current, setCurrent] = useState(0);
  
    const handlePrevious = () => {
      setCurrent(current === 0 ? kols.length - 1 : current - 1);
    };
  
    const handleNext = () => {
      setCurrent(current === kols.length - 1 ? 0 : current + 1);
    };
  
    const handleCardClick = (index: number) => {
      if (current !== index) {
        setCurrent(index);
      }
    };
  
    return (
      <div className="relative w-full py-20 bg-black text-white">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Your KOL Collection</h2>
          <p className="text-gray-400 text-lg">4 Elite Traders • 160,000 Total Tokens</p>
        </div>
  
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateX(-${current * (100 / kols.length)}%)`,
              width: `${kols.length * 100}%`,
            }}
          >
            {kols.map((kol, index) => (
              <div key={kol.slot} className="flex-shrink-0" style={{ width: `${100 / kols.length}%` }}>
                <KOLCard
                  kol={kol}
                  index={index}
                  current={current}
                  handleCardClick={handleCardClick}
                />
              </div>
            ))}
          </div>
        </div>
  
        <div className="flex justify-center items-center space-x-6 mt-8">
          <CarouselControl direction="prev" onClick={handlePrevious} />
          <div className="text-gray-400 min-w-[100px] text-center">
            {current + 1} / {kols.length}
          </div>
          <CarouselControl direction="next" onClick={handleNext} />
        </div>
      </div>
    );
  };