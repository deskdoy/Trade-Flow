import React, { useEffect, useState } from "react";
import { MarketData } from "@/packages/shared/src/types/index";

interface OrderBookProps {
  ticker: MarketData | null;
}

interface DepthLevel {
  price: number;
  size: number;
  total: number;
}

export default function OrderBook({ ticker }: OrderBookProps) {
  const [bids, setBids] = useState<DepthLevel[]>([]);
  const [asks, setAsks] = useState<DepthLevel[]>([]);

  // Regenerate book whenever ticker ticks to match the center spread price
  useEffect(() => {
    if (!ticker) return;

    const last = ticker.last;
    const isCrypto = last > 1000;
    const decimalPlaces = isCrypto ? 1 : 2;

    const tempAsks: DepthLevel[] = [];
    const tempBids: DepthLevel[] = [];

    let askTotal = 0;
    let bidTotal = 0;

    // Generate 6 levels of ask (above market price)
    for (let i = 6; i >= 1; i--) {
      const price = last + (i * (last * 0.00015));
      const size = Math.random() * (isCrypto ? 0.8 : 150) + 0.05;
      askTotal += size;
      tempAsks.push({
        price: Number(price.toFixed(decimalPlaces)),
        size: Number(size.toFixed(isCrypto ? 3 : 1)),
        total: Number(askTotal.toFixed(isCrypto ? 3 : 1)),
      });
    }

    // Generate 6 levels of bid (below market price)
    for (let i = 1; i <= 6; i++) {
      const price = last - (i * (last * 0.00015));
      const size = Math.random() * (isCrypto ? 0.8 : 150) + 0.05;
      bidTotal += size;
      tempBids.push({
        price: Number(price.toFixed(decimalPlaces)),
        size: Number(size.toFixed(isCrypto ? 3 : 1)),
        total: Number(bidTotal.toFixed(isCrypto ? 3 : 1)),
      });
    }

    setAsks(tempAsks);
    setBids(tempBids);
  }, [ticker]);

  return (
    <div className="w-72 bg-brand-panel border border-brand-border rounded flex flex-col overflow-hidden select-none shadow-lg">
      <div className="h-11 border-b border-brand-border bg-brand-header px-4 flex items-center justify-between">
        <span className="text-xs font-bold text-white tracking-wide">Order Depth Book</span>
        <span className="text-[10px] font-mono text-brand-text-muted">Spread: 0.02%</span>
      </div>

      <div className="flex-1 p-3 flex flex-col justify-between font-mono text-[11px]">
        {/* Ask Levels (RED) - Sell Limit depth */}
        <div className="flex flex-col space-y-0.5">
          <div className="grid grid-cols-3 text-brand-text-muted font-sans font-bold pb-1 text-[10px] uppercase">
            <span>Price</span>
            <span className="text-right">Size</span>
            <span className="text-right">Total</span>
          </div>
          {asks.map((level, idx) => (
            <div key={`ask-${idx}`} className="grid grid-cols-3 relative hover:bg-brand-red/10 py-0.5">
              {/* Depth background bar */}
              <div 
                className="absolute right-0 top-0 bottom-0 bg-brand-red/10 transition-all duration-300 pointer-events-none"
                style={{ width: `${Math.min(100, (level.total / (asks[0]?.total || 1)) * 100)}%` }}
              />
              <span className="text-brand-red font-medium z-10">{level.price.toLocaleString()}</span>
              <span className="text-right text-brand-text z-10">{level.size}</span>
              <span className="text-right text-brand-text-muted z-10">{level.total}</span>
            </div>
          ))}
        </div>

        {/* Center Spread / Last Ticked Price Indicator */}
        <div className="py-2.5 my-1.5 border-y border-brand-border bg-brand-header/45 text-center flex items-center justify-center space-x-2">
          <span className="text-sm font-bold text-brand-green">
            {ticker ? ticker.last.toLocaleString() : "..."}
          </span>
          <span className="text-[10px] text-brand-green">▲</span>
        </div>

        {/* Bid Levels (GREEN) - Buy Limit depth */}
        <div className="flex flex-col space-y-0.5">
          {bids.map((level, idx) => (
            <div key={`bid-${idx}`} className="grid grid-cols-3 relative hover:bg-brand-green/10 py-0.5">
              {/* Depth background bar */}
              <div 
                className="absolute right-0 top-0 bottom-0 bg-brand-green/10 transition-all duration-300 pointer-events-none"
                style={{ width: `${Math.min(100, (level.total / (bids[bids.length - 1]?.total || 1)) * 100)}%` }}
              />
              <span className="text-brand-green font-medium z-10">{level.price.toLocaleString()}</span>
              <span className="text-right text-brand-text z-10">{level.size}</span>
              <span className="text-right text-brand-text-muted z-10">{level.total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
