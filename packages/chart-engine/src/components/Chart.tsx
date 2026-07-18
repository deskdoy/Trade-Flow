import React, { useEffect, useRef } from "react";
import { Candle } from "@tradeflow/shared";
import { ChartEngine } from "../ChartEngine.ts";

export interface ChartProps {
  candles: Candle[];
  symbol: string;
  timeframe: string;
  theme?: "light" | "dark";
}

export const Chart: React.FC<ChartProps> = ({
  candles,
  symbol,
  timeframe,
  theme = "dark",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartEngineRef = useRef<ChartEngine | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    // Initialize ChartEngine
    const activeTheme: "light" | "dark" = theme === "light" ? "light" : "dark";
    const engine = new ChartEngine(containerRef.current, activeTheme);
    chartEngineRef.current = engine;

    // Set initial candles data
    engine.setCandles(candles);

    // Setup ResizeObserver for responsive resizing
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) {
        return;
      }
      const { width, height } = entries[0].contentRect;
      engine.resize(width, height);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      engine.destroy();
      chartEngineRef.current = null;
    };
  }, [theme]); // Recreate chart if theme changes

  // Update candles when they change
  useEffect(() => {
    if (chartEngineRef.current) {
      chartEngineRef.current.setCandles(candles);
    }
  }, [candles]);

  const isDark = theme === "dark";

  return (
    <div className={`flex flex-col h-full w-full rounded-xl border ${
      isDark ? "bg-[#0c0d14] border-brand-border" : "bg-white border-gray-200"
    }`}>
      {/* Chart Header Bar */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isDark ? "border-brand-border bg-[#0e1017]" : "border-gray-200 bg-gray-50"
      }`}>
        <div className="flex items-center space-x-3">
          <span className={`font-bold font-sans text-sm tracking-tight ${
            isDark ? "text-white" : "text-gray-900"
          }`}>
            {symbol}
          </span>
          <span className={`px-2 py-0.5 text-[10px] font-mono font-medium rounded ${
            isDark ? "bg-[#1d2030] text-brand-blue" : "bg-blue-50 text-blue-600"
          }`}>
            {timeframe}
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className={isDark ? "text-zinc-500" : "text-gray-400"}>Chart Engine:</span>
          <span className="text-brand-green font-semibold">TV Lightweight 4.2</span>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="flex-1 w-full min-h-[300px] relative overflow-hidden" ref={containerRef} />
    </div>
  );
};
