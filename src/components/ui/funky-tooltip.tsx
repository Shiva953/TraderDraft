"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface FunkyTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}

export function FunkyTooltip({ children, content, className }: FunkyTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipWidth = 320; // max-w-[320px]
      const viewportWidth = window.innerWidth;
      
      // Calculate if tooltip would go off screen on the right
      const wouldOverflowRight = rect.left + rect.width / 2 + tooltipWidth / 2 > viewportWidth - 20;
      
      // If near right edge, align tooltip to the right of the trigger instead of center
      const leftPosition = wouldOverflowRight 
        ? rect.right + window.scrollX - tooltipWidth + 20 // Align to right with 20px padding
        : rect.left + rect.width / 2 + window.scrollX;
      
      setPosition({
        top: rect.top + window.scrollY,
        left: leftPosition,
      });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const tooltipContent = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{
            duration: 0.2,
            ease: [0.34, 1.56, 0.64, 1], // Custom bouncy easing
          }}
          style={{
            position: 'fixed',
            top: position.top - 10,
            left: position.left,
            transform: 'translateY(-100%)',
            zIndex: 9999,
          }}
          className={cn("pointer-events-none", className)}
        >
          {/* Tooltip content */}
          <div className="relative">
            {/* Main tooltip */}
            <div className="relative bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 border border-neutral-700/50 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-sm min-w-[280px] max-w-[320px]">
              {content}
            </div>

            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px]">
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-neutral-800" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {mounted && createPortal(tooltipContent, document.body)}
    </>
  );
}

