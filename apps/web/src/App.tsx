import React, { useState, useEffect, useRef } from "react";
import { 
  Server, 
  Cpu, 
  Layers, 
  BookOpen, 
  CheckCircle2, 
  Database, 
  Network, 
  Activity, 
  ChevronRight, 
  Info, 
  Flame, 
  FolderTree, 
  CheckSquare, 
  Clock, 
  Compass,
  TrendingUp,
  Sliders,
  Terminal,
  Zap,
  Power,
  RefreshCw,
  HelpCircle,
  FileText
} from "lucide-react";
import { Chart, ChartIndicatorData, ChartDrawingData } from "@tradeflow/chart-engine";
import { Candle } from "@tradeflow/shared";
import { 
  MarketDataEngine, 
  MockProvider, 
  BinanceProvider, 
  MT5Provider, 
  ReplayProvider, 
  CSVProvider 
} from "@tradeflow/market-data";
import { IndicatorEngine, SMAIndicator, EMAIndicator } from "@tradeflow/indicators";
import { DrawingEngine, SerializedDrawing, DrawingPoint } from "@tradeflow/drawing-engine";
import { 
  MousePointer, 
  Minus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  FolderOpen 
} from "lucide-react";

interface SystemHealthInfo {
  status: "UP" | "DOWN";
  timestamp: string;
  uptimeSeconds: number;
  system: {
    platform: string;
    memoryFree: number;
    memoryTotal: number;
    cpuCount: number;
  };
  database: {
    connected: boolean;
    provider: string;
    configured: boolean;
  };
  version: string;
}

interface EventLog {
  time: string;
  type: string;
  message: string;
}

export default function App() {
  // System Health state from the API
  const [health, setHealth] = useState<SystemHealthInfo | null>(null);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Chart, Symbol, Timeframe Selection States
  const [selectedSymbol, setSelectedSymbol] = useState<"BTC/USD" | "ETH/USD" | "SOL/USD">("BTC/USD");
  const [selectedTimeframe, setSelectedTimeframe] = useState<"1D" | "4H" | "1H">("1D");
  const [candles, setCandles] = useState<Candle[]>([]);

  // Indicators State
  const [activeIndicators, setActiveIndicators] = useState<{ sma20: boolean; ema50: boolean }>({
    sma20: false,
    ema50: false,
  });
  const [chartIndicators, setChartIndicators] = useState<ChartIndicatorData[]>([]);

  // Drawing Engine States
  const [activeTool, setActiveTool] = useState<"cursor" | "horizontal_line" | "trend_line">("cursor");
  const [pendingPoints, setPendingPoints] = useState<DrawingPoint[]>([]);
  const [drawingsList, setDrawingsList] = useState<SerializedDrawing[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [serializedData, setSerializedData] = useState<string>("");

  // Engine & Provider States
  const [activeProviderId, setActiveProviderId] = useState<string>("mock");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isSwitching, setIsSwitching] = useState<boolean>(false);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);

  // Initialize the MarketDataEngine once
  const engineRef = useRef<MarketDataEngine | null>(null);
  if (!engineRef.current) {
    const mock = new MockProvider();
    const binance = new BinanceProvider();
    const mt5 = new MT5Provider();
    const replay = new ReplayProvider();
    const csv = new CSVProvider();

    // Register all providers in the engine
    engineRef.current = new MarketDataEngine([mock, binance, mt5, replay, csv]);
  }

  // Initialize IndicatorEngine once
  const indicatorEngineRef = useRef<IndicatorEngine | null>(null);
  if (!indicatorEngineRef.current) {
    indicatorEngineRef.current = new IndicatorEngine();
  }

  // Initialize DrawingEngine once
  const drawingEngineRef = useRef<DrawingEngine | null>(null);
  if (!drawingEngineRef.current) {
    drawingEngineRef.current = new DrawingEngine();
  }

  // Bind DrawingEngine event listeners to sync state
  useEffect(() => {
    const drawingEngine = drawingEngineRef.current;
    if (!drawingEngine) return;

    const handleCreated = () => {
      setDrawingsList(drawingEngine.getDrawings().map((d) => d.serialize()));
    };
    const handleUpdated = () => {
      setDrawingsList(drawingEngine.getDrawings().map((d) => d.serialize()));
    };
    const handleRemoved = () => {
      setDrawingsList(drawingEngine.getDrawings().map((d) => d.serialize()));
    };
    const handleSelected = (payload: { drawing: any }) => {
      setSelectedDrawingId(payload.drawing ? payload.drawing.id : null);
    };
    const handleLoaded = () => {
      setDrawingsList(drawingEngine.getDrawings().map((d) => d.serialize()));
    };
    const handleCleared = () => {
      setDrawingsList([]);
      setSelectedDrawingId(null);
    };

    drawingEngine.on("created", handleCreated);
    drawingEngine.on("updated", handleUpdated);
    drawingEngine.on("removed", handleRemoved);
    drawingEngine.on("selected", handleSelected);
    drawingEngine.on("loaded", handleLoaded);
    drawingEngine.on("cleared", handleCleared);

    // Initial load
    setDrawingsList(drawingEngine.getDrawings().map((d) => d.serialize()));

    return () => {
      drawingEngine.off("created", handleCreated);
      drawingEngine.off("updated", handleUpdated);
      drawingEngine.off("removed", handleRemoved);
      drawingEngine.off("selected", handleSelected);
      drawingEngine.off("loaded", handleLoaded);
      drawingEngine.off("cleared", handleCleared);
    };
  }, []);

  // Synchronize indicators registration and perform calculations
  useEffect(() => {
    const engine = indicatorEngineRef.current;
    if (!engine) return;

    const currentIndicators = engine.getIndicators();

    // Manage SMA 20
    const hasSma20 = currentIndicators.some((ind) => ind.id === "sma_20");
    if (activeIndicators.sma20 && !hasSma20) {
      engine.registerIndicator(new SMAIndicator("sma_20", { period: 20 }));
    } else if (!activeIndicators.sma20 && hasSma20) {
      engine.removeIndicator("sma_20");
    }

    // Manage EMA 50
    const hasEma50 = currentIndicators.some((ind) => ind.id === "ema_50");
    if (activeIndicators.ema50 && !hasEma50) {
      engine.registerIndicator(new EMAIndicator("ema_50", { period: 50 }));
    } else if (!activeIndicators.ema50 && hasEma50) {
      engine.removeIndicator("ema_50");
    }

    // Trigger calculation if we have candles
    if (candles.length > 0) {
      const results = engine.calculateAll(candles, selectedSymbol, selectedTimeframe);
      const chartDataList: ChartIndicatorData[] = [];

      if (activeIndicators.sma20) {
        const points = results.get("sma_20") || [];
        chartDataList.push({
          id: "sma_20",
          name: "SMA (20)",
          color: "#3b82f6", // elegant blue
          points,
        });
      }

      if (activeIndicators.ema50) {
        const points = results.get("ema_50") || [];
        chartDataList.push({
          id: "ema_50",
          name: "EMA (50)",
          color: "#f59e0b", // elegant amber
          points,
        });
      }

      setChartIndicators(chartDataList);
    } else {
      setChartIndicators([]);
    }
  }, [candles, activeIndicators, selectedSymbol, selectedTimeframe]);

  // Poll server health diagnostics
  const fetchHealth = async () => {
    try {
      const startTime = performance.now();
      const res = await fetch("/api/health");
      const endTime = performance.now();
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const json = await res.json();
      if (json.success) {
        setHealth(json.data);
        setHealthError(null);
      } else {
        throw new Error(json.error?.message || "Invalid health response format");
      }
      setPingMs(Math.round(endTime - startTime));
      setIsHealthLoading(false);
    } catch (err: any) {
      console.warn("Health diagnostic ping warning:", err);
      setHealthError(err.message || "Endpoint offline");
      setIsHealthLoading(false);
    }
  };

  const handleChartClick = (price: number, time: string) => {
    const drawingEngine = drawingEngineRef.current;
    if (!drawingEngine) return;

    if (activeTool === "horizontal_line") {
      const id = `hl_${Date.now()}`;
      drawingEngine.createDrawing("horizontal_line", id, [{ time, price }]);
      setActiveTool("cursor");
    } else if (activeTool === "trend_line") {
      if (pendingPoints.length === 0) {
        setPendingPoints([{ time, price }]);
      } else {
        const id = `tl_${Date.now()}`;
        drawingEngine.createDrawing("trend_line", id, [pendingPoints[0], { time, price }]);
        setPendingPoints([]);
        setActiveTool("cursor");
      }
    } else if (activeTool === "cursor") {
      const activeDrawings = drawingEngine.getDrawings();
      let nearestId: string | null = null;
      let minDistance = Infinity;

      for (const d of activeDrawings) {
        for (const pt of d.points) {
          const dist = Math.abs(pt.price - price) / price;
          if (dist < minDistance && dist < 0.05) {
            minDistance = dist;
            nearestId = d.id;
          }
        }
      }

      drawingEngine.selectDrawing(nearestId);
    }
  };

  const handleNudge = (direction: "up" | "down") => {
    const drawingEngine = drawingEngineRef.current;
    if (!drawingEngine) return;

    const selected = drawingEngine.getSelectedDrawing();
    if (!selected) return;

    const basePrice = selected.points[0]?.price || 100;
    const delta = basePrice * 0.002 * (direction === "up" ? 1 : -1);
    
    drawingEngine.moveSelected(delta);
    setDrawingsList(drawingEngine.getDrawings().map((d) => d.serialize()));
  };

  const handleDeleteDrawing = (id: string) => {
    const drawingEngine = drawingEngineRef.current;
    if (drawingEngine) {
      drawingEngine.removeDrawing(id);
    }
  };

  const handleClearDrawings = () => {
    const drawingEngine = drawingEngineRef.current;
    if (drawingEngine) {
      drawingEngine.clearDrawings();
    }
  };

  const handleUpdateStyle = (options: { color?: string; lineWidth?: number }) => {
    const drawingEngine = drawingEngineRef.current;
    if (!drawingEngine) return;

    const selected = drawingEngine.getSelectedDrawing();
    if (selected) {
      if (options.color) selected.color = options.color;
      if (options.lineWidth) selected.lineWidth = options.lineWidth;
      drawingEngine.selectDrawing(selected.id);
      setDrawingsList(drawingEngine.getDrawings().map((d) => d.serialize()));
    }
  };

  const handleSaveDrawings = () => {
    const drawingEngine = drawingEngineRef.current;
    if (drawingEngine) {
      const data = drawingEngine.serialize();
      setSerializedData(data);
      localStorage.setItem("tradeflow_drawings", data);
    }
  };

  const handleLoadDrawings = () => {
    const drawingEngine = drawingEngineRef.current;
    if (drawingEngine) {
      const data = localStorage.getItem("tradeflow_drawings") || serializedData;
      if (data) {
        drawingEngine.deserialize(data);
      }
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Sync state & events between MarketDataEngine and React state
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const addLog = (type: string, message: string) => {
      const time = new Date().toLocaleTimeString();
      setEventLogs((prev) => [{ time, type, message }, ...prev].slice(0, 40));
    };

    // Event Handler: historyLoaded
    const handleHistoryLoaded = (payload: { symbol: string; timeframe: string; candles: Candle[] }) => {
      addLog("historyLoaded", `Retrieved ${payload.candles.length} candles for ${payload.symbol} [${payload.timeframe}]`);
      if (payload.symbol === selectedSymbol && payload.timeframe === selectedTimeframe) {
        setCandles(payload.candles);
      }
    };

    // Event Handler: newCandle
    const handleNewCandle = (payload: { symbol: string; timeframe: string; candle: Candle }) => {
      const c = payload.candle;
      addLog("newCandle", `Tick ${payload.symbol} (${payload.timeframe}) | O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)}`);
      
      if (payload.symbol === selectedSymbol && payload.timeframe === selectedTimeframe) {
        setCandles((prev) => {
          if (prev.length === 0) return [payload.candle];
          const last = prev[prev.length - 1];
          // If the candle has the same timestamp as the last, replace it. Otherwise, push it.
          if (last.time === payload.candle.time) {
            return [...prev.slice(0, -1), payload.candle];
          } else {
            return [...prev, payload.candle];
          }
        });
      }
    };

    // Event Handler: providerChanged
    const handleProviderChanged = (payload: { providerId: string; providerName: string }) => {
      addLog("providerChanged", `Switched active provider to ${payload.providerName}`);
      setIsConnected(engine.getActiveProvider()?.isConnected || false);
    };

    // Event Handler: connectionChanged
    const handleConnectionChanged = (payload: { providerId: string; isConnected: boolean }) => {
      addLog("connectionChanged", `Provider "${payload.providerId}" is now ${payload.isConnected ? "CONNECTED" : "DISCONNECTED"}`);
      if (payload.providerId === engine.getActiveProvider()?.id) {
        setIsConnected(payload.isConnected);
      }
    };

    // Event Handler: error
    const handleError = (payload: { providerId: string; message: string; error?: Error }) => {
      addLog("error", `[${payload.providerId}] Error: ${payload.message}`);
    };

    // Register listeners
    engine.on("historyLoaded", handleHistoryLoaded);
    engine.on("newCandle", handleNewCandle);
    engine.on("providerChanged", handleProviderChanged);
    engine.on("connectionChanged", handleConnectionChanged);
    engine.on("error", handleError);

    // Initial configuration & activation
    const currentActive = engine.getActiveProvider();
    if (currentActive) {
      setActiveProviderId(currentActive.id);
      setIsConnected(currentActive.isConnected);
    }

    // Connect and subscribe for current selection
    engine.connect().then(() => {
      setIsConnected(engine.getActiveProvider()?.isConnected || false);
      engine.subscribe(selectedSymbol, selectedTimeframe);
      engine.getHistory(selectedSymbol, selectedTimeframe);
    });

    return () => {
      // Cleanup events and subscription on selection change
      engine.off("historyLoaded", handleHistoryLoaded);
      engine.off("newCandle", handleNewCandle);
      engine.off("providerChanged", handleProviderChanged);
      engine.off("connectionChanged", handleConnectionChanged);
      engine.off("error", handleError);
      
      engine.unsubscribe(selectedSymbol, selectedTimeframe);
    };
  }, [selectedSymbol, selectedTimeframe]);

  // Handle manual provider swapping
  const handleProviderSwap = async (providerId: string) => {
    const engine = engineRef.current;
    if (!engine || isSwitching) return;

    try {
      setIsSwitching(true);
      await engine.switchProvider(providerId);
      setActiveProviderId(providerId);
    } catch (err: any) {
      console.error("[App] Swapping provider failed:", err);
    } finally {
      setIsSwitching(false);
    }
  };

  // Toggle active provider connectivity state
  const handleToggleConnection = async () => {
    const engine = engineRef.current;
    if (!engine) return;

    if (isConnected) {
      await engine.disconnect();
    } else {
      await engine.connect();
      // On reconnect, reload history
      await engine.getHistory(selectedSymbol, selectedTimeframe);
      engine.subscribe(selectedSymbol, selectedTimeframe);
    }
  };

  // Format bytes to GB
  const formatGB = (bytes: number) => {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2);
  };

  // Format uptime
  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const providersConfig = [
    { id: "mock", name: "Simulator Engine", desc: "Realistic price simulator. Generates live ticks every second.", isMock: true, active: true },
    { id: "binance", name: "Binance Pro API", desc: "Production-grade exchange feed. [Restricted in Sprint 4]", isMock: false, active: false },
    { id: "mt5", name: "MetaTrader 5 Connect", desc: "Enterprise multi-asset bridge. [Restricted in Sprint 4]", isMock: false, active: false },
    { id: "replay", name: "Historical Replay", desc: "Backtesting simulator streaming history. [Restricted in Sprint 4]", isMock: false, active: false },
    { id: "csv", name: "CSV File Ingestor", desc: "Parse custom datasets dynamically. [Restricted in Sprint 4]", isMock: false, active: false }
  ];

  const activeProviderObj = providersConfig.find(p => p.id === activeProviderId);

  return (
    <div className="flex flex-col h-screen bg-brand-bg text-brand-text font-sans overflow-hidden">
      
      {/* Top Header */}
      <header className="h-16 bg-brand-header border-b border-brand-border px-6 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-brand-gold flex items-center justify-center text-brand-bg font-extrabold text-sm tracking-widest shadow-md shadow-brand-gold/10">
            TF
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-white font-bold tracking-tight text-sm">TradeFlow Engine</h1>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-brand-gold/10 text-brand-gold border border-brand-gold/20 uppercase">
                Sprint 4 Active
              </span>
            </div>
            <p className="text-[10px] text-brand-text-muted uppercase font-mono tracking-wider">Independent Market Data Hub</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs">
          {/* Active Provider Connection Badge */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-brand-panel rounded border border-brand-border">
            <span className={`w-2.5 h-2.5 rounded-full ${
              isConnected 
                ? "bg-brand-green animate-pulse" 
                : "bg-brand-slate"
            }`} />
            <span className="font-mono text-white text-[11px] uppercase tracking-wider font-semibold">
              {activeProviderObj?.name}: {isConnected ? "CONNECTED" : "OFFLINE"}
            </span>
          </div>

          {/* Latency ping indicator */}
          {!healthError && pingMs !== null && (
            <div className="hidden sm:flex items-center space-x-1.5 text-brand-text-muted font-mono text-[11px]">
              <Activity className="w-3.5 h-3.5 text-brand-gold" />
              <span>Diagnostic Ping: {pingMs}ms</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Workspace Display Area */}
        <main className="flex-1 overflow-y-auto p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Left Columns: Interactive Chart & Live Events Console */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Interactive Chart Section */}
            <section className="bg-brand-panel border border-brand-border rounded-lg p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 border-b border-brand-border/40 pb-3 gap-3">
                <div className="flex items-center space-x-2.5">
                  <TrendingUp className="w-5 h-5 text-brand-gold" />
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Financial Visualization</h2>
                    <p className="text-[10px] text-brand-text-muted">Consuming abstract events from Market Data Engine</p>
                  </div>
                </div>
                
                {/* Control Panel: Symbol & Timeframe */}
                <div className="flex items-center space-x-3">
                  {/* Symbol Selector */}
                  <div className="flex rounded bg-brand-bg p-0.5 border border-brand-border">
                    {(["BTC/USD", "ETH/USD", "SOL/USD"] as const).map((sym) => (
                      <button
                        key={sym}
                        onClick={() => setSelectedSymbol(sym)}
                        className={`px-3 py-1 text-[10px] font-mono font-bold rounded transition-all ${
                          selectedSymbol === sym
                            ? "bg-brand-gold text-brand-bg"
                            : "text-brand-text-muted hover:text-white"
                        }`}
                      >
                        {sym.split("/")[0]}
                      </button>
                    ))}
                  </div>

                  {/* Timeframe Selector */}
                  <div className="flex rounded bg-brand-bg p-0.5 border border-brand-border">
                    {(["1D", "4H", "1H"] as const).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setSelectedTimeframe(tf)}
                        className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded transition-all ${
                          selectedTimeframe === tf
                            ? "bg-brand-gold text-brand-bg"
                            : "text-brand-text-muted hover:text-white"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawing Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2.5 bg-brand-panel/40 border border-brand-border/60 rounded-t-lg border-b-0 gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-brand-gold mr-1.5 font-mono">Drawing Tools:</span>
                  <button
                    onClick={() => { setActiveTool("cursor"); setPendingPoints([]); }}
                    className={`p-1.5 rounded text-[10px] font-bold flex items-center space-x-1.5 transition ${
                      activeTool === "cursor" ? "bg-brand-gold text-brand-bg font-bold shadow-md" : "bg-brand-bg hover:bg-brand-bg/80 text-white border border-brand-border"
                    }`}
                    title="Cursor Tool: Select, move, and edit drawings"
                  >
                    <MousePointer className="w-3.5 h-3.5" />
                    <span>Cursor</span>
                  </button>
                  <button
                    onClick={() => { setActiveTool("horizontal_line"); setPendingPoints([]); }}
                    className={`p-1.5 rounded text-[10px] font-bold flex items-center space-x-1.5 transition ${
                      activeTool === "horizontal_line" ? "bg-brand-gold text-brand-bg font-bold shadow-md" : "bg-brand-bg hover:bg-brand-bg/80 text-white border border-brand-border"
                    }`}
                    title="Place Horizontal Line (Click chart)"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Horizontal</span>
                  </button>
                  <button
                    onClick={() => { setActiveTool("trend_line"); setPendingPoints([]); }}
                    className={`p-1.5 rounded text-[10px] font-bold flex items-center space-x-1.5 transition ${
                      activeTool === "trend_line" ? "bg-brand-gold text-brand-bg font-bold shadow-md" : "bg-brand-bg hover:bg-brand-bg/80 text-white border border-brand-border"
                    }`}
                    title="Draw Trend Line (Click first point, then second)"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Trend Line</span>
                  </button>
                </div>

                <div className="text-[10px] font-mono text-brand-text-muted leading-relaxed sm:text-right">
                  {activeTool === "cursor" && "Cursor: Click a line on chart/sidebar to modify or delete."}
                  {activeTool === "horizontal_line" && "Horizontal Line: Click on the chart to place."}
                  {activeTool === "trend_line" && (
                    pendingPoints.length === 0
                      ? "Trend Line: Click on chart to place starting anchor."
                      : "Trend Line: Click again on chart to place ending anchor."
                  )}
                </div>
              </div>

              {/* Chart Component or Offline Notice */}
              <div className="h-[400px] w-full relative bg-brand-bg rounded-b-lg border border-brand-border/40 overflow-hidden">
                {!isConnected ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-brand-bg/95 z-10 text-center p-6">
                    <Power className="w-10 h-10 text-brand-slate animate-pulse" />
                    <h3 className="text-white text-xs uppercase font-bold tracking-wider">Feed Stream Offline</h3>
                    <p className="text-[11px] text-brand-text-muted max-w-sm">
                      The active provider is currently disconnected. Click "Connect Provider" in the control panel to start receiving real-time prices.
                    </p>
                    <button
                      onClick={handleToggleConnection}
                      className="px-4 py-1.5 bg-brand-gold hover:bg-brand-gold/90 text-brand-bg text-[11px] font-bold uppercase rounded tracking-wider shadow-sm transition"
                    >
                      Connect Provider
                    </button>
                  </div>
                ) : candles.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 z-10">
                    <RefreshCw className="w-6 h-6 text-brand-gold animate-spin" />
                    <p className="text-[11px] text-brand-text-muted font-mono">Querying historical index...</p>
                  </div>
                ) : (
                  <Chart
                    candles={candles}
                    symbol={selectedSymbol}
                    timeframe={selectedTimeframe}
                    theme="dark"
                    indicators={chartIndicators}
                    drawings={drawingsList}
                    onChartClick={handleChartClick}
                  />
                )}
              </div>
            </section>

            {/* Live Events Terminal Console */}
            <section className="bg-brand-panel border border-brand-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-3 border-b border-brand-border/40 pb-3">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-5 h-5 text-brand-gold" />
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">Market Event Dispatch Bus</h2>
                    <p className="text-[9px] text-brand-text-muted">Real-time callbacks captured from the type-safe event model</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEventLogs([])}
                  className="text-[10px] text-brand-slate hover:text-white underline font-mono cursor-pointer"
                >
                  Clear Bus
                </button>
              </div>

              {/* Console Logs */}
              <div className="bg-brand-bg border border-brand-border/60 rounded p-4 h-[240px] overflow-y-auto font-mono text-[11px] text-brand-text-muted space-y-2 select-all">
                {eventLogs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-brand-slate text-[10px]">
                    &gt; No events emitted yet. Toggle options above or wait for ticks...
                  </div>
                ) : (
                  eventLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start space-x-2 border-b border-brand-border/20 pb-1.5 last:border-0">
                      <span className="text-brand-slate flex-shrink-0">[{log.time}]</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase flex-shrink-0 tracking-wider ${
                        log.type === "newCandle" 
                          ? "bg-brand-green/10 text-brand-green" 
                          : log.type === "historyLoaded" 
                            ? "bg-blue-500/10 text-blue-400" 
                            : log.type === "providerChanged" 
                              ? "bg-brand-gold/10 text-brand-gold" 
                              : "bg-red-500/10 text-red-400"
                      }`}>
                        {log.type}
                      </span>
                      <span className="text-white leading-relaxed">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Engine Controls, Diagnostics, & Architectural Spec */}
          <div className="space-y-6">
            
            {/* Drawing Objects Manager Hub */}
            <section className="bg-brand-panel border border-brand-border rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3 border-b border-brand-border/40 pb-2.5">
                <div className="flex items-center space-x-2 text-brand-gold">
                  <TrendingUp className="w-5 h-5" />
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">Drawing Engine Objects</h2>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={handleSaveDrawings}
                    className="p-1.5 rounded bg-brand-bg hover:bg-brand-bg/80 text-white border border-brand-border text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                    title="Serialize drawings to LocalStorage"
                  >
                    <Save className="w-3 h-3 text-brand-gold" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={handleLoadDrawings}
                    className="p-1.5 rounded bg-brand-bg hover:bg-brand-bg/80 text-white border border-brand-border text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                    title="Deserialize drawings from LocalStorage"
                  >
                    <FolderOpen className="w-3 h-3 text-blue-400" />
                    <span>Load</span>
                  </button>
                  <button
                    onClick={handleClearDrawings}
                    className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                    title="Clear all drawings"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Active Drawings List */}
              <div className="space-y-2 mb-4">
                {drawingsList.length === 0 ? (
                  <p className="text-[10px] text-brand-text-muted italic py-3 text-center border border-dashed border-brand-border/60 rounded">
                    No drawings created. Select a tool above the chart and click on the chart to draw.
                  </p>
                ) : (
                  drawingsList.map((d) => {
                    const isSelected = selectedDrawingId === d.id;
                    return (
                      <div
                        key={d.id}
                        onClick={() => {
                          const engine = drawingEngineRef.current;
                          if (engine) engine.selectDrawing(d.id);
                        }}
                        className={`p-2.5 rounded border flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? "bg-brand-gold/10 border-brand-gold text-white"
                            : "bg-brand-bg/40 border-brand-border hover:border-brand-slate text-brand-text-muted"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
                            style={{ backgroundColor: (d.properties?.color as string) || "#10b981" }}
                          />
                          <div>
                            <span className="text-[11px] font-bold font-mono text-white block">
                              {d.type === "horizontal-line" || d.type === "horizontal_line"
                                ? `Horizontal (${d.properties?.price ?? d.points[0]?.price ?? 0})`
                                : `Trend Line (${d.points.length} pts)`}
                            </span>
                            <span className="text-[9px] text-brand-text-muted font-mono">ID: {d.id}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          {isSelected && (
                            <span className="text-[9px] bg-brand-gold text-brand-bg px-1.5 py-0.2 font-bold rounded uppercase mr-1">
                              Selected
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDrawing(d.id);
                            }}
                            className="p-1 hover:text-red-400 text-brand-slate transition"
                            title="Delete drawing"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selected Drawing Manipulator Controls */}
              {selectedDrawingId && (
                <div className="p-3 bg-brand-bg border border-brand-border rounded space-y-3">
                  <div className="flex items-center justify-between border-b border-brand-border/40 pb-2">
                    <span className="text-[10px] uppercase font-bold text-brand-gold font-mono">Manipulate Selected Drawing</span>
                    <span className="text-[10px] text-brand-slate font-mono">{selectedDrawingId}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] text-brand-text-muted">Nudge Price:</span>
                      <button
                        onClick={() => handleNudge("up")}
                        className="p-1.5 bg-brand-panel hover:bg-brand-border text-white rounded border border-brand-border text-[10px] font-bold flex items-center space-x-1"
                        title="Nudge Up"
                      >
                        <ArrowUp className="w-3 h-3 text-brand-green" />
                        <span>Up</span>
                      </button>
                      <button
                        onClick={() => handleNudge("down")}
                        className="p-1.5 bg-brand-panel hover:bg-brand-border text-white rounded border border-brand-border text-[10px] font-bold flex items-center space-x-1"
                        title="Nudge Down"
                      >
                        <ArrowDown className="w-3 h-3 text-brand-red" />
                        <span>Down</span>
                      </button>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] text-brand-text-muted">Color:</span>
                      {["#ef4444", "#10b981", "#3b82f6", "#f59e0b", "#ec4899"].map((c) => (
                        <button
                          key={c}
                          onClick={() => handleUpdateStyle({ color: c })}
                          className="w-4 h-4 rounded-full border border-white/40 cursor-pointer transition hover:scale-110"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Indicator Control Hub */}
            <section className="bg-brand-panel border border-brand-border rounded-lg p-5 shadow-sm">
              <div className="flex items-center space-x-2 mb-3 border-b border-brand-border/40 pb-2.5 text-brand-gold">
                <Sliders className="w-5 h-5" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Indicator Engine Hub</h2>
              </div>
              <p className="text-[10px] text-brand-text-muted mb-4 leading-relaxed">
                Enable technical indicators calculated in real-time by the modular Indicator Engine.
              </p>

              <div className="space-y-3">
                {/* SMA Checkbox */}
                <label className="flex items-start space-x-3 p-3 rounded bg-brand-bg/40 border border-brand-border/60 hover:border-brand-slate cursor-pointer select-none transition">
                  <input
                    type="checkbox"
                    checked={activeIndicators.sma20}
                    onChange={(e) => setActiveIndicators(prev => ({ ...prev, sma20: e.target.checked }))}
                    className="w-4 h-4 rounded text-brand-gold focus:ring-brand-gold border-brand-border bg-brand-bg mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">SMA (20)</span>
                      <span className="text-[9px] font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                        Line: Blue
                      </span>
                    </div>
                    <p className="text-[10px] text-brand-text-muted mt-0.5">Simple Moving Average over a 20-period window</p>
                  </div>
                </label>

                {/* EMA Checkbox */}
                <label className="flex items-start space-x-3 p-3 rounded bg-brand-bg/40 border border-brand-border/60 hover:border-brand-slate cursor-pointer select-none transition">
                  <input
                    type="checkbox"
                    checked={activeIndicators.ema50}
                    onChange={(e) => setActiveIndicators(prev => ({ ...prev, ema50: e.target.checked }))}
                    className="w-4 h-4 rounded text-brand-gold focus:ring-brand-gold border-brand-border bg-brand-bg mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">EMA (50)</span>
                      <span className="text-[9px] font-mono font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                        Line: Gold
                      </span>
                    </div>
                    <p className="text-[10px] text-brand-text-muted mt-0.5">Exponential Moving Average over a 50-period window</p>
                  </div>
                </label>
              </div>
            </section>

            {/* Market Engine Control Hub */}
            <section className="bg-brand-panel border border-brand-border rounded-lg p-5">
              <div className="flex items-center space-x-2 mb-3 border-b border-brand-border/40 pb-2.5">
                <Sliders className="w-5 h-5 text-brand-gold" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Engine Provider Control</h2>
              </div>

              <div className="space-y-4">
                {/* Connection switch */}
                <div className="flex items-center justify-between p-3 bg-brand-bg/40 border border-brand-border rounded">
                  <div>
                    <h3 className="text-xs font-bold text-white">Active Channel Status</h3>
                    <p className="text-[10px] text-brand-text-muted">Turn off simulation or API connections</p>
                  </div>
                  <button
                    onClick={handleToggleConnection}
                    className={`p-2 rounded-full cursor-pointer transition ${
                      isConnected 
                        ? "bg-brand-green/20 text-brand-green hover:bg-brand-green/30" 
                        : "bg-brand-slate/20 text-brand-slate hover:bg-brand-slate/30"
                    }`}
                  >
                    <Power className="w-5 h-5" />
                  </button>
                </div>

                {/* Provider List Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] text-brand-text-muted font-bold uppercase tracking-wider">Select Engine Provider</label>
                  <div className="space-y-2">
                    {providersConfig.map((p) => {
                      const isSelected = activeProviderId === p.id;
                      return (
                        <div 
                          key={p.id}
                          onClick={() => !isSwitching && handleProviderSwap(p.id)}
                          className={`p-3 rounded border text-left cursor-pointer transition flex flex-col justify-between ${
                            isSelected 
                              ? "bg-brand-gold/10 border-brand-gold text-white" 
                              : "bg-brand-bg/40 border-brand-border text-brand-text-muted hover:border-brand-slate"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold font-mono">{p.name}</span>
                            <span className={`text-[8px] px-1.5 py-0.2 rounded font-mono uppercase tracking-wider ${
                              p.isMock 
                                ? "bg-brand-green/10 text-brand-green border border-brand-green/25" 
                                : "bg-brand-slate/20 text-brand-slate border border-brand-border"
                            }`}>
                              {p.isMock ? "Active Feed" : "Restricted placeholder"}
                            </span>
                          </div>
                          <p className="text-[10px] leading-relaxed text-brand-text-muted">{p.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* Engine Architecture & Event Patterns Spec */}
            <section className="bg-brand-panel border border-brand-border rounded-lg p-5">
              <div className="flex items-center space-x-2 mb-3 text-brand-gold">
                <BookOpen className="w-5 h-5" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Architecture Spec Guide</h2>
              </div>
              <div className="space-y-3.5 text-xs">
                <div className="p-3 bg-brand-bg/50 border border-brand-border/40 rounded space-y-1.5">
                  <h4 className="font-bold text-white text-[11px] flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5 text-brand-gold" />
                    <span>Clean Provider Separation</span>
                  </h4>
                  <p className="text-[10px] text-brand-text-muted leading-relaxed">
                    The visualization tier is completely decoupled. The <code className="font-mono text-white bg-brand-border px-1 rounded">ChartEngine</code> class only consumes an array of candles, and is oblivious to the source.
                  </p>
                </div>

                <div className="p-3 bg-brand-bg/50 border border-brand-border/40 rounded space-y-1.5">
                  <h4 className="font-bold text-white text-[11px] flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-brand-gold" />
                    <span>Contract Interface</span>
                  </h4>
                  <p className="text-[10px] text-brand-text-muted leading-relaxed">
                    All provider models strictly implement the <code className="font-mono text-white bg-brand-border px-1 rounded">MarketDataProvider</code> interface contract, providing identical signatures for connection and subscribe streams.
                  </p>
                </div>
              </div>
            </section>

            {/* Diagnostic Logs (Preserved from Sprint 3) */}
            <section className="bg-brand-panel border border-brand-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4 border-b border-brand-border/40 pb-3">
                <div className="flex items-center space-x-2">
                  <Server className="w-5 h-5 text-brand-gold" />
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">Operational Diagnostics (API)</h2>
                </div>
                <span className="text-[10px] text-brand-slate font-mono bg-brand-bg px-2 py-0.5 rounded border border-brand-border">
                  /api/health
                </span>
              </div>

              {isHealthLoading && !health ? (
                <div className="py-2 flex flex-col items-center justify-center space-y-2 text-brand-text-muted">
                  <div className="w-5 h-5 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-mono">Pinging Node service...</p>
                </div>
              ) : healthError ? (
                <div className="p-3 bg-brand-red/10 border border-brand-red/30 rounded text-brand-red text-[11px] font-mono">
                  Diagnostics endpoint offline
                </div>
              ) : health ? (
                <div className="space-y-2.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">Uptime:</span>
                    <span className="text-white">{formatUptime(health.uptimeSeconds)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">OS Platform:</span>
                    <span className="text-white uppercase text-[10px] bg-brand-border px-1.5 py-0.5 rounded">
                      {health.system.platform}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">CPU Cores:</span>
                    <span className="text-white">{health.system.cpuCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">Node version:</span>
                    <span className="text-white">v{health.version}</span>
                  </div>
                </div>
              ) : null}
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}
