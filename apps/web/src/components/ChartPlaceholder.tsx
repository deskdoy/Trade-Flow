import React, { useState, useRef, useEffect } from "react";
import { 
  Maximize2, 
  Settings2, 
  LayoutGrid, 
  TrendingUp, 
  Compass, 
  Check, 
  ChevronDown,
  RefreshCw
} from "lucide-react";
import { MarketData } from "@/packages/shared/src/types/index";

interface ChartPlaceholderProps {
  selectedSymbol: string;
  ticker: MarketData | null;
}

export default function ChartPlaceholder({ selectedSymbol, ticker }: ChartPlaceholderProps) {
  const [interval, setIntervalVal] = useState("15m");
  const [chartType, setChartType] = useState("Candlestick");
  const [showIndicators, setShowIndicators] = useState(false);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(["EMA (20)", "RSI"]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, show: false });
  const [crosshairPrice, setCrosshairPrice] = useState<number>(0);
  const [crosshairTime, setCrosshairTime] = useState<string>("");

  const timeframes = ["1m", "5m", "15m", "1H", "4H", "1D", "1W"];
  const chartTypes = ["Candlestick", "Heikin Ashi", "Line", "Area", "OHLC"];
  const indicatorsList = ["SMA (50)", "EMA (20)", "EMA (200)", "Bollinger Bands", "RSI", "MACD", "Volume Profile"];

  // Handle crosshair calculation relative to the canvas
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !ticker) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Crosshair boundaries
    if (x >= 0 && x <= rect.width && y >= 45 && y <= rect.height - 30) {
      setMousePos({ x, y, show: true });

      // Map Y coordinates to relative prices based on the ticker price
      const priceRange = ticker.last * 0.1; // +/- 5% range
      const minPrice = ticker.last - priceRange / 2;
      const maxPrice = ticker.last + priceRange / 2;
      const heightPercentage = 1 - (y - 45) / (rect.height - 75);
      const calculatedPrice = minPrice + heightPercentage * priceRange;
      setCrosshairPrice(Number(calculatedPrice.toFixed(2)));

      // Map X coordinates to generic time chunks
      const widthPercentage = x / rect.width;
      const hoursAgo = Math.round((1 - widthPercentage) * 24);
      setCrosshairTime(`${hoursAgo} hrs ago`);
    } else {
      setMousePos((prev) => ({ ...prev, show: false }));
    }
  };

  const handleMouseLeave = () => {
    setMousePos((prev) => ({ ...prev, show: false }));
  };

  const toggleIndicator = (ind: string) => {
    if (selectedIndicators.includes(ind)) {
      setSelectedIndicators(selectedIndicators.filter((i) => i !== ind));
    } else {
      setSelectedIndicators([...selectedIndicators, ind]);
    }
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="flex-1 bg-brand-panel border border-brand-border rounded flex flex-col overflow-hidden relative select-none shadow-xl"
    >
      {/* Chart Control Toolbar */}
      <div className="h-11 border-b border-brand-border bg-brand-header px-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-white tracking-wide">{selectedSymbol}</span>
            <span className="text-xs font-mono text-brand-text-muted">{interval}</span>
          </div>

          <div className="h-4 w-px bg-brand-border" />

          {/* Timeframe Selectors */}
          <div className="flex items-center space-x-1">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setIntervalVal(tf)}
                className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer transition-all duration-150 ${
                  interval === tf 
                    ? "bg-brand-gold/15 text-brand-gold border border-brand-gold/35" 
                    : "text-brand-text-muted hover:text-white hover:bg-brand-hover"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-brand-border" />

          {/* Chart Type Dropdown Placeholder */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 px-2.5 py-1 text-xs text-brand-text-muted hover:text-white hover:bg-brand-hover rounded transition-all cursor-pointer">
              <TrendingUp className="w-3.5 h-3.5 text-brand-gold" />
              <span>{chartType}</span>
              <ChevronDown className="w-3 h-3 text-brand-slate" />
            </button>
            <div className="hidden group-hover:block absolute left-0 top-7 w-36 bg-brand-header border border-brand-border rounded shadow-2xl py-1 z-20">
              {chartTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className="w-full text-left px-3 py-1.5 text-xs text-brand-text-muted hover:text-white hover:bg-brand-hover flex items-center justify-between"
                >
                  <span>{type}</span>
                  {chartType === type && <Check className="w-3 h-3 text-brand-gold" />}
                </button>
              ))}
            </div>
          </div>

          {/* Indicators Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowIndicators(!showIndicators)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs hover:text-white hover:bg-brand-hover rounded transition-all cursor-pointer ${
                showIndicators ? "text-brand-gold bg-brand-hover" : "text-brand-text-muted"
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-brand-gold" />
              <span>Indicators ({selectedIndicators.length})</span>
              <ChevronDown className="w-3 h-3 text-brand-slate" />
            </button>
            {showIndicators && (
              <>
                <div className="fixed inset-0 z-15" onClick={() => setShowIndicators(false)} />
                <div className="absolute left-0 top-7 w-48 bg-brand-header border border-brand-border rounded shadow-2xl py-1.5 z-20">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold text-brand-slate tracking-wider font-serif italic">
                    Indicator Overlays
                  </div>
                  {indicatorsList.map((ind) => (
                    <button
                      key={ind}
                      onClick={() => toggleIndicator(ind)}
                      className="w-full text-left px-3 py-1.5 text-xs text-brand-text-muted hover:text-white hover:bg-brand-hover flex items-center justify-between"
                    >
                      <span>{ind}</span>
                      {selectedIndicators.includes(ind) && <Check className="w-3 h-3 text-brand-gold" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 text-brand-text-muted">
          <button className="p-1 hover:text-white hover:bg-brand-hover rounded transition-all cursor-pointer">
            <Settings2 className="w-4 h-4" />
          </button>
          <button className="p-1 hover:text-white hover:bg-brand-hover rounded transition-all cursor-pointer">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Placeholder area */}
      <div className="flex-1 relative bg-brand-bg p-4 overflow-hidden flex flex-col justify-between">
        {/* Radial Grid Pattern overlay from Design HTML */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#474D57 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        {/* Active Indicators Overlay Tag */}
        <div className="flex items-center space-x-2 absolute top-4 left-4 z-10">
          {selectedIndicators.map((ind) => (
            <span key={ind} className="text-[10px] font-mono bg-brand-header/80 border border-brand-border text-brand-text-muted px-2 py-0.5 rounded flex items-center space-x-1">
              <span>{ind}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
            </span>
          ))}
        </div>

        {/* Real-time Ticker Value Tag inside canvas */}
        <div className="absolute top-4 right-4 text-right z-10 pointer-events-none">
          <div className="text-[10px] text-brand-slate font-mono">LAST TICK</div>
          <div className="text-xl font-mono font-bold text-brand-green">
            {ticker ? ticker.last.toLocaleString() : "..."}
          </div>
        </div>

        {/* Dynamic Vector Graph Grid Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Graphical Technical Line Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-12">
          {ticker ? (
            <svg viewBox="0 0 500 200" className="w-full h-3/5 opacity-40 text-brand-green" preserveAspectRatio="none">
              {/* Shaded Area */}
              <path
                d="M 0 140 Q 100 80, 180 120 T 320 60 T 420 100 T 500 50 L 500 200 L 0 200 Z"
                fill="currentColor"
                className="text-brand-green/10"
              />
              {/* Signal Line */}
              <path
                d="M 0 140 Q 100 80, 180 120 T 320 60 T 420 100 T 500 50"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-brand-green"
              />
              {/* Secondary Moving Average Line */}
              <path
                d="M 0 160 Q 110 110, 190 130 T 310 80 T 430 110 T 500 70"
                fill="none"
                stroke="#F0B90B"
                strokeWidth="1.5"
                className="opacity-60"
              />
            </svg>
          ) : (
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-brand-slate animate-spin mx-auto mb-2" />
              <p className="text-xs text-brand-slate font-mono">Initializing Signal Engine...</p>
            </div>
          )}
        </div>

        {/* Interactive Crosshairs */}
        {mousePos.show && ticker && (
          <>
            {/* Horizontal Line */}
            <div 
              className="absolute left-0 right-0 border-t border-dashed border-brand-slate/50 pointer-events-none" 
              style={{ top: mousePos.y }}
            />
            {/* Vertical Line */}
            <div 
              className="absolute top-0 bottom-0 border-l border-dashed border-brand-slate/50 pointer-events-none" 
              style={{ left: mousePos.x }}
            />

            {/* Price Y-Axis Badge */}
            <div 
              className="absolute right-1 font-mono text-[9px] font-bold text-brand-bg bg-brand-gold px-2 py-0.5 rounded shadow pointer-events-none"
              style={{ top: mousePos.y - 8 }}
            >
              {crosshairPrice.toLocaleString()}
            </div>

            {/* Time X-Axis Badge */}
            <div 
              className="absolute bottom-1.5 font-mono text-[9px] text-brand-text bg-brand-header px-2 py-0.5 rounded border border-brand-border pointer-events-none"
              style={{ left: mousePos.x - 30 }}
            >
              {crosshairTime}
            </div>
          </>
        )}

        {/* Canvas Y-Axis values placeholder */}
        <div className="absolute right-2 top-11 bottom-8 w-16 flex flex-col justify-between text-right text-[10px] font-mono text-brand-slate pointer-events-none">
          <span>{ticker ? (ticker.last * 1.05).toLocaleString() : "—"}</span>
          <span>{ticker ? (ticker.last * 1.02).toLocaleString() : "—"}</span>
          <span>{ticker ? (ticker.last * 1.00).toLocaleString() : "—"}</span>
          <span>{ticker ? (ticker.last * 0.98).toLocaleString() : "—"}</span>
          <span>{ticker ? (ticker.last * 0.95).toLocaleString() : "—"}</span>
        </div>

        {/* Canvas Bottom X-Axis hours placeholder */}
        <div className="h-4 flex justify-between text-[9px] font-mono text-brand-slate mt-auto pt-1 border-t border-brand-border/50 z-10 pointer-events-none">
          <span>10:00 UTC</span>
          <span>11:00 UTC</span>
          <span>12:00 UTC</span>
          <span>13:00 UTC</span>
          <span>14:00 UTC</span>
          <span>15:00 UTC</span>
          <span className="w-16"></span> {/* Empty gap for Y-Axis values */}
        </div>
      </div>
    </div>
  );
}
