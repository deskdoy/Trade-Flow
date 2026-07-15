import React, { useState, useEffect } from "react";
import { TrendingUp, Percent, ArrowUpRight, ArrowDownRight, RefreshCw, Layers2, BookOpen, AlertCircle } from "lucide-react";
import TopNav from "./components/TopNav.tsx";
import Sidebar from "./components/Sidebar.tsx";
import ChartPlaceholder from "./components/ChartPlaceholder.tsx";
import OrderBook from "./components/OrderBook.tsx";
import OrderForm from "./components/OrderForm.tsx";
import PositionsList from "./components/PositionsList.tsx";
import StatusNav from "./components/StatusNav.tsx";

import { MarketData, Order, Position, AccountInfo } from "@/packages/shared/src/types/index";
import { formatCurrency, formatPercent } from "@/packages/shared/src/utils/index";
import { HealthStatus } from "@/apps/api/src/services/health";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedSymbol, setSelectedSymbol] = useState("BTC/USD");

  // Live state managers
  const [tickers, setTickers] = useState<Record<string, MarketData> | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [apiHealth, setApiHealth] = useState<HealthStatus | null>(null);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Synchronize data helper
  const fetchData = async () => {
    try {
      const startTime = performance.now();
      
      // Execute fetches in parallel to minimize latency overhead
      const [tickersRes, accountRes, positionsRes, ordersRes, healthRes] = await Promise.all([
        fetch("/api/trade/tickers").then((r) => r.json()),
        fetch("/api/trade/account").then((r) => r.json()),
        fetch("/api/trade/positions").then((r) => r.json()),
        fetch("/api/trade/orders").then((r) => r.json()),
        fetch("/api/health").then((r) => r.json()),
      ]);

      const endTime = performance.now();
      setPingMs(Math.round(endTime - startTime));

      if (tickersRes.success) setTickers(tickersRes.data);
      if (accountRes.success) setAccount(accountRes.data);
      if (positionsRes.success) setPositions(positionsRes.data);
      if (ordersRes.success) setOrders(ordersRes.data);
      if (healthRes.success) setApiHealth(healthRes.data);

      setIsLoading(false);
    } catch (error) {
      console.error("Failed to query live engine data feed:", error);
    }
  };

  // Immediate fetch + active polling mechanism
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000); // Polling every 2 seconds is clean and rapid
    return () => clearInterval(interval);
  }, []);

  const handleCancelOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/trade/orders/${id}`, {
        method: "DELETE",
      });
      const resJson = await res.json();
      if (resJson.success) {
        fetchData(); // reload values
      } else {
        alert(resJson.error || "Could not cancel order");
      }
    } catch (err) {
      console.error("Order cancellation failure:", err);
    }
  };

  const activeTicker = tickers ? tickers[selectedSymbol] : null;

  return (
    <div className="flex flex-col h-screen bg-brand-bg text-brand-text-muted font-sans overflow-hidden">
      {/* Top Header */}
      <TopNav account={account} isLoading={isLoading} />

      {/* Main Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side menu */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Workspace Display Area */}
        <main className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
          {activeTab === "dashboard" ? (
            <>
              {/* Tickers Watch Bar */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 select-none">
                {tickers ? (
                  Object.values(tickers).map((tick: MarketData) => {
                    const isSelected = selectedSymbol === tick.symbol;
                    const changeVal = (tick.last - tick.high * 0.99); // generic pnl ratio
                    const isPositive = changeVal >= 0;
                    const pctChange = (changeVal / tick.last) * 100;

                    return (
                      <div
                        key={tick.symbol}
                        onClick={() => setSelectedSymbol(tick.symbol)}
                        className={`p-3 rounded border transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? "bg-brand-gold/10 border-brand-gold shadow-md shadow-brand-gold/5"
                            : "bg-brand-panel border-brand-border hover:border-brand-slate hover:bg-brand-hover"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-extrabold text-brand-text tracking-wide">{tick.symbol}</span>
                          <span className={`text-[10px] font-mono font-bold flex items-center space-x-0.5 ${
                            isPositive ? "text-brand-green" : "text-brand-red"
                          }`}>
                            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            <span>{pctChange.toFixed(2)}%</span>
                          </span>
                        </div>
                        <div className="text-sm font-mono font-bold text-white tracking-tight">
                          {tick.last.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[9px] font-mono text-brand-slate mt-1 flex justify-between">
                          <span>Vol: {tick.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 rounded bg-brand-panel/50 border border-brand-border animate-pulse" />
                  ))
                )}
              </div>

              {/* Center Trading Desk Grid */}
              <div className="flex-1 flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4 min-h-[350px]">
                {/* Visual Chart Canvas */}
                <ChartPlaceholder selectedSymbol={selectedSymbol} ticker={activeTicker} />

                {/* Right sidebar form & order depth panels */}
                <div className="flex flex-col sm:flex-row lg:flex-col space-y-4 sm:space-y-0 sm:space-x-4 lg:space-x-0 lg:space-y-4">
                  <OrderForm
                    selectedSymbol={selectedSymbol}
                    ticker={activeTicker}
                    onOrderSuccess={fetchData}
                  />
                  <OrderBook ticker={activeTicker} />
                </div>
              </div>

              {/* Bottom Open Positions and Trades Tab List */}
              <PositionsList
                positions={positions}
                orders={orders}
                onCancelOrder={handleCancelOrder}
                isLoading={isLoading}
              />
            </>
          ) : activeTab === "markets" ? (
            <div className="bg-brand-panel border border-brand-border rounded p-6 space-y-4">
              <h2 className="text-lg font-bold text-white font-serif italic uppercase tracking-wide">Full Market Directory</h2>
              <p className="text-sm text-brand-text-muted">
                Configure your TradeFlow watches, discover spreads, and analyze historical ranges.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tickers && Object.values(tickers).map((tick: MarketData) => (
                  <div key={tick.symbol} className="p-4 bg-brand-bg rounded border border-brand-border flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-brand-text">{tick.symbol}</h3>
                      <p className="text-xs text-brand-slate font-mono">Volume: {tick.volume.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm text-brand-gold font-bold">{formatCurrency(tick.last)}</span>
                      <div className="text-[10px] text-brand-slate font-mono">High: {tick.high} | Low: {tick.low}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === "positions" ? (
            <div className="bg-brand-panel border border-brand-border rounded p-6">
              <h2 className="text-lg font-bold text-white mb-4 font-serif italic uppercase tracking-wide">Portfolio Analytics</h2>
              <PositionsList
                positions={positions}
                orders={orders}
                onCancelOrder={handleCancelOrder}
                isLoading={isLoading}
              />
            </div>
          ) : activeTab === "indicators" ? (
            <div className="bg-brand-panel border border-brand-border rounded p-6 space-y-4">
              <div className="flex items-center space-x-3 text-brand-gold">
                <Layers2 className="w-6 h-6" />
                <h2 className="text-lg font-bold text-white font-serif italic uppercase tracking-wide">Quantitative & Technical Analysis</h2>
              </div>
              <p className="text-sm text-brand-text-muted leading-relaxed">
                Configure future moving averages, MACD, Relative Strength Index (RSI), and Bollinger Bands overlays.
                This engine will connect straight to our indicator calculations package located at <code className="bg-brand-bg px-1.5 py-0.5 rounded text-brand-text">/packages/indicators</code>.
              </p>
              <div className="grid grid-cols-3 gap-4 font-mono">
                <div className="p-4 bg-brand-bg rounded border border-brand-border">
                  <h3 className="text-sm font-bold text-brand-text mb-1 font-sans">Simple Moving Average (SMA)</h3>
                  <span className="text-[10px] text-brand-gold">Calculated Period: 50</span>
                </div>
                <div className="p-4 bg-brand-bg rounded border border-brand-border">
                  <h3 className="text-sm font-bold text-brand-text mb-1 font-sans">Relative Strength Index (RSI)</h3>
                  <span className="text-[10px] text-brand-green">Overbought: 70 | Oversold: 30</span>
                </div>
                <div className="p-4 bg-brand-bg rounded border border-brand-border">
                  <h3 className="text-sm font-bold text-brand-text mb-1 font-sans">Bollinger Bands</h3>
                  <span className="text-[10px] text-brand-gold">Standard Dev: 2.0</span>
                </div>
              </div>
            </div>
          ) : activeTab === "logs" ? (
            <div className="bg-brand-panel border border-brand-border rounded p-6 space-y-4">
              <div className="flex items-center space-x-3 text-brand-gold">
                <BookOpen className="w-6 h-6" />
                <h2 className="text-lg font-bold text-white font-serif italic uppercase tracking-wide">Trade Journals & Session Logs</h2>
              </div>
              <p className="text-sm text-brand-text-muted">
                View structured server metrics, configuration changes, and complete audit tables below.
              </p>
              <div className="bg-brand-bg p-4 rounded border border-brand-border font-mono text-xs text-brand-slate space-y-1">
                <p>[2026-07-14 08:30:45] API Gateway successfully synchronized with host on port 3000</p>
                <p>[2026-07-14 08:30:52] CORS validation completed successfully for '*' origins</p>
                <p>[2026-07-14 08:31:10] In-memory mock database successfully provisioned with seed tickers</p>
                <p>[2026-07-14 08:31:15] TradingService: system ready to accept trade execution payload schemas</p>
              </div>
            </div>
          ) : (
            <div className="bg-brand-panel border border-brand-border rounded p-6 space-y-6">
              <h2 className="text-lg font-bold text-white font-serif italic uppercase tracking-wide">TradeFlow Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-brand-bg rounded border border-brand-border">
                  <div>
                    <h3 className="text-xs font-bold text-brand-text uppercase">Interactive Trade Confirmations</h3>
                    <p className="text-[10px] text-brand-slate">Ask for visual confirmations on order executions</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-brand-gold accent-brand-gold bg-brand-panel border-brand-border" />
                </div>
                <div className="flex items-center justify-between p-3.5 bg-brand-bg rounded border border-brand-border">
                  <div>
                    <h3 className="text-xs font-bold text-brand-text uppercase">Dynamic Ticker Walk Engine</h3>
                    <p className="text-[10px] text-brand-slate">Enable ticking random walks for simulation watch lists</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-brand-gold accent-brand-gold bg-brand-panel border-brand-border" />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer status diagnostics bar */}
      <StatusNav apiHealth={apiHealth} pingMs={pingMs} />
    </div>
  );
}
