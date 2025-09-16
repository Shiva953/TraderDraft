"use client";

import React, { useEffect, useRef } from "react";

interface TradingViewChartProps {
  tokenSymbol: string;
  tokenMint?: string;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({ 
  tokenSymbol, 
  tokenMint 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    // Load TradingView script
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => initWidget();
    document.head.appendChild(script);

    return () => {
      if (widgetRef.current) {
        widgetRef.current.remove();
      }
      const existingScript = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  const initWidget = () => {
    if (typeof window.TradingView !== "undefined" && containerRef.current) {
      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: `RAYDIUM:${tokenSymbol.toUpperCase()}SOL`, // Adjust based on your DEX
        interval: "15", // 15-minute candles
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1", // Candle style
        locale: "en",
        toolbar_bg: "#1a1a1a",
        enable_publishing: false,
        backgroundColor: "#1a1a1a",
        gridColor: "#2a2a2a",
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        container_id: containerRef.current.id,
        studies: [
          "Volume@tv-basicstudies",
          "RSI@tv-basicstudies"
        ],
        overrides: {
          "paneProperties.background": "#1a1a1a",
          "paneProperties.vertGridProperties.color": "#2a2a2a",
          "paneProperties.horzGridProperties.color": "#2a2a2a",
          "symbolWatermarkProperties.transparency": 90,
          "scalesProperties.textColor": "#AAA",
          "mainSeriesProperties.candleStyle.upColor": "#00ff88",
          "mainSeriesProperties.candleStyle.downColor": "#ff4757",
          "mainSeriesProperties.candleStyle.borderUpColor": "#00ff88",
          "mainSeriesProperties.candleStyle.borderDownColor": "#ff4757",
          "mainSeriesProperties.candleStyle.wickUpColor": "#00ff88",
          "mainSeriesProperties.candleStyle.wickDownColor": "#ff4757",
          "volumePaneSize": "medium",
        },
        disabled_features: [
          "use_localstorage_for_settings",
          "volume_force_overlay",
          "create_volume_indicator_by_default"
        ],
        enabled_features: [
          "study_templates"
        ],
        loading_screen: {
          backgroundColor: "#1a1a1a",
          foregroundColor: "#ffffff"
        }
      });
    }
  };

  return (
    <div className="h-96 w-full bg-neutral-900 rounded-lg overflow-hidden">
      <div 
        ref={containerRef}
        id={`tradingview-chart-${tokenSymbol}`}
        className="h-full w-full"
      />
    </div>
  );
};

export default TradingViewChart;