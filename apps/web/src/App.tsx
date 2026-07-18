import React, { useState, useEffect } from "react";
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
  Compass
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

export default function App() {
  const [health, setHealth] = useState<SystemHealthInfo | null>(null);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

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
        setFetchError(null);
        setConsecutiveFailures(0);
      } else {
        throw new Error(json.error?.message || "Invalid health response format");
      }
      setPingMs(Math.round(endTime - startTime));
      setIsLoading(false);
    } catch (err: any) {
      console.warn("Health poll warning (retrying):", err);
      setConsecutiveFailures((prev) => {
        const next = prev + 1;
        if (next >= 3) {
          setFetchError(err.message || "Network connection failure");
        }
        return next;
      });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Format memory bytes to gigabytes
  const formatGB = (bytes: number) => {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2);
  };

  // Format uptime in hh:mm:ss
  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Static definition of packages for visualization
  const packagesList = [
    { name: "@tradeflow/shared", desc: "Common models, interfaces, validation schemas, and formatters.", status: "Core - Ready" },
    { name: "@tradeflow/ui", desc: "Design system elements and shared interface visual components.", status: "Stubbed - Active" },
    { name: "@tradeflow/chart-engine", desc: "High-frequency financial visualization modules.", status: "Stubbed - Active" },
    { name: "@tradeflow/indicators", desc: "Technical analysis mathematical algorithms.", status: "Stubbed - Active" },
    { name: "@tradeflow/market-data", desc: "Standard feed interfaces and mock price streamers.", status: "Interface Ready" },
    { name: "@tradeflow/broker", desc: "Brokerage connectors and trade executor wrappers.", status: "Interface Ready" },
    { name: "@tradeflow/backtesting", desc: "Replay core evaluating past strategy models.", status: "Stubbed - Active" },
    { name: "@tradeflow/strategy-engine", desc: "Automated trading logic orchestrators.", status: "Stubbed - Active" },
    { name: "@tradeflow/alerts", desc: "Condition monitors raising notification triggers.", status: "Stubbed - Active" },
    { name: "@tradeflow/storage", desc: "Database query abstractions and caching providers.", status: "Stubbed - Active" },
    { name: "@tradeflow/authentication", desc: "Identity managers, token handlers, and secure rules.", status: "Stubbed - Active" },
    { name: "@tradeflow/ai", desc: "Intelligent processing models and LLM adapters.", status: "Stubbed - Active" }
  ];

  return (
    <div className="flex flex-col h-screen bg-brand-bg text-brand-text font-sans overflow-hidden">
      
      {/* Top Header */}
      <header className="h-16 bg-brand-header border-b border-brand-border px-6 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-brand-gold flex items-center justify-center text-brand-bg font-extrabold text-sm tracking-widest shadow-md shadow-brand-gold/10">
            TF
          </div>
          <div>
            <h1 className="text-white font-bold tracking-tight text-sm">TradeFlow Engine</h1>
            <p className="text-[10px] text-brand-text-muted uppercase font-mono tracking-wider">Refactoring Sprint & Diagnostics</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs">
          {/* Connection Status Indicator */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-brand-panel rounded border border-brand-border">
            <span className={`w-2.5 h-2.5 rounded-full ${
              fetchError 
                ? "bg-brand-red animate-pulse" 
                : consecutiveFailures > 0 
                  ? "bg-brand-gold animate-pulse" 
                  : "bg-brand-green"
            }`} />
            <span className="font-mono text-white text-[11px] uppercase tracking-wider font-semibold">
              {fetchError 
                ? "API Offline" 
                : consecutiveFailures > 0 
                  ? "Reconnecting..." 
                  : "API Online"}
            </span>
          </div>

          {/* Latency ping indicator */}
          {!fetchError && pingMs !== null && (
            <div className="hidden sm:flex items-center space-x-1.5 text-brand-text-muted font-mono text-[11px]">
              <Activity className="w-3.5 h-3.5 text-brand-gold" />
              <span>Ping: {pingMs}ms</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Panel */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Workspace Display Area */}
        <main className="flex-1 overflow-y-auto p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Left Column: Diagnostics and Monorepo Overview */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Health Dashboard Card */}
            <section className="bg-brand-panel border border-brand-border rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-brand-border/40 pb-3">
                <div className="flex items-center space-x-2">
                  <Server className="w-5 h-5 text-brand-gold" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Operational Diagnostics (Clean API)</h2>
                </div>
                <span className="text-xs text-brand-slate font-mono bg-brand-bg px-2 py-0.5 rounded border border-brand-border">
                  GET /api/health
                </span>
              </div>

              {isLoading && !health ? (
                <div className="py-6 flex flex-col items-center justify-center space-y-2 text-brand-text-muted">
                  <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-mono">Querying active endpoint...</p>
                </div>
              ) : fetchError ? (
                <div className="p-4 bg-brand-red/10 border border-brand-red/30 rounded-lg text-brand-red text-xs space-y-1">
                  <p className="font-bold uppercase tracking-wider flex items-center space-x-1.5">
                    <span>Diagnostic query unsuccessful</span>
                  </p>
                  <p className="font-mono text-[11px]">{fetchError}</p>
                </div>
              ) : health ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Specs */}
                  <div className="space-y-3 bg-brand-bg/50 border border-brand-border/50 p-4 rounded-lg">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-brand-text-muted">System State:</span>
                      <span className="text-brand-green font-mono font-bold bg-brand-green/10 px-1.5 py-0.5 rounded">
                        {health.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-brand-text-muted">Uptime:</span>
                      <span className="text-white font-mono">{formatUptime(health.uptimeSeconds)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-brand-text-muted">Node Version:</span>
                      <span className="text-white font-mono">v{health.version}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-brand-text-muted">OS Platform:</span>
                      <span className="text-white font-mono uppercase text-[10px] bg-brand-border px-1.5 py-0.5 rounded">
                        {health.system.platform}
                      </span>
                    </div>
                  </div>

                  {/* Right Specs */}
                  <div className="space-y-3 bg-brand-bg/50 border border-brand-border/50 p-4 rounded-lg">
                    {/* CPU Count */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-brand-text-muted flex items-center space-x-1.5">
                        <Cpu className="w-3.5 h-3.5 text-brand-slate" />
                        <span>CPU Cores:</span>
                      </span>
                      <span className="text-white font-mono font-semibold">{health.system.cpuCount}</span>
                    </div>

                    {/* Database provider */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-brand-text-muted flex items-center space-x-1.5">
                        <Database className="w-3.5 h-3.5 text-brand-slate" />
                        <span>SQL Store:</span>
                      </span>
                      <span className="text-brand-text font-mono text-[10px] flex items-center space-x-1.5">
                        <span className="text-brand-slate">({health.database.provider})</span>
                        <span className="text-brand-red font-semibold uppercase bg-brand-red/10 px-1.5 py-0.5 rounded">Offline</span>
                      </span>
                    </div>

                    {/* Memory usage bar */}
                    <div className="text-xs space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-brand-text-muted">Allocated RAM:</span>
                        <span className="text-white font-mono font-semibold">
                          {formatGB(health.system.memoryTotal - health.system.memoryFree)} / {formatGB(health.system.memoryTotal)} GB
                        </span>
                      </div>
                      <div className="w-full bg-brand-border h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-brand-gold h-full" 
                          style={{ width: `${((health.system.memoryTotal - health.system.memoryFree) / health.system.memoryTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            {/* Packages Hub */}
            <section className="bg-brand-panel border border-brand-border rounded-lg p-5">
              <div className="flex items-center space-x-2 mb-4 border-b border-brand-border/40 pb-3">
                <Layers className="w-5 h-5 text-brand-gold" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Packages Workspace Hub (@tradeflow/*)</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {packagesList.map((pkg) => (
                  <div 
                    key={pkg.name} 
                    className="p-3 bg-brand-bg/40 border border-brand-border hover:border-brand-slate rounded transition duration-150 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h3 className="font-mono text-xs font-bold text-white">{pkg.name}</h3>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                          pkg.status.includes("Ready") 
                            ? "bg-brand-green/10 text-brand-green border border-brand-green/20" 
                            : "bg-brand-gold/10 text-brand-gold border border-brand-gold/20"
                        }`}>
                          {pkg.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-brand-text-muted leading-relaxed">{pkg.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Monorepo Architecture Overview & Future Roadmap */}
          <div className="space-y-6">
            
            {/* Sprint Overview Card */}
            <section className="bg-brand-panel border border-brand-border rounded-lg p-5">
              <div className="flex items-center space-x-2 mb-3 text-brand-gold">
                <CheckSquare className="w-5 h-5" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Sprint Accomplishments</h2>
              </div>
              <ul className="space-y-3 text-xs leading-relaxed">
                <li className="flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-green mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-brand-text block">Monorepo Setup Complete</strong>
                    <span className="text-brand-text-muted">Repository migrated to a real pnpm workspace, standardizing apps/ and packages/ directories.</span>
                  </div>
                </li>
                <li className="flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-green mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-brand-text block">Clean API Architecture</strong>
                    <span className="text-brand-text-muted">Refactored apps/api into clean layers: domain, application, infrastructure, and interfaces.</span>
                  </div>
                </li>
                <li className="flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-green mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-brand-text block">Dependency Injection Container</strong>
                    <span className="text-brand-text-muted">Established a lightweight static services container with factory functions for loose coupling.</span>
                  </div>
                </li>
                <li className="flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-green mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-brand-text block">Centralized Configuration</strong>
                    <span className="text-brand-text-muted">Isolated app environment, logging drivers, and constants inside distinct config modules.</span>
                  </div>
                </li>
              </ul>
            </section>

            {/* Visual Workspace Folder Tree */}
            <section className="bg-brand-panel border border-brand-border rounded-lg p-5">
              <div className="flex items-center space-x-2 mb-3">
                <FolderTree className="w-5 h-5 text-brand-gold" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Monorepo File Structure</h2>
              </div>
              <div className="bg-brand-bg/50 border border-brand-border/40 p-4 rounded font-mono text-[11px] text-brand-text-muted space-y-1.5 overflow-x-auto">
                <div>📁 tradeflow/</div>
                <div className="pl-4">📁 apps/</div>
                <div className="pl-8 text-white">📁 api/ <span className="text-[10px] text-brand-gold">(Clean Layered Architecture)</span></div>
                <div className="pl-12 text-brand-slate">├── 📁 application/ <span className="text-[9px] text-brand-slate">(Use cases)</span></div>
                <div className="pl-12 text-brand-slate">├── 📁 domain/ <span className="text-[9px] text-brand-slate">(Entities & models)</span></div>
                <div className="pl-12 text-brand-slate">├── 📁 infrastructure/ <span className="text-[9px] text-brand-slate">(DI & servers)</span></div>
                <div className="pl-12 text-brand-slate">└── 📁 interfaces/ <span className="text-[9px] text-brand-slate">(Controllers & routes)</span></div>
                <div className="pl-8 text-white">📁 web/ <span className="text-[10px] text-brand-gold">(Diagnostics Dashboard)</span></div>
                
                <div className="pl-4">📁 packages/</div>
                <div className="pl-8 text-brand-green">├── 📁 shared/ <span className="text-[9px] text-brand-slate">(Centralized model schemas)</span></div>
                <div className="pl-8 text-brand-slate">├── 📁 ui/</div>
                <div className="pl-8 text-brand-slate">├── 📁 market-data/ <span className="text-[9px] text-brand-slate">(Provider interfaces)</span></div>
                <div className="pl-8 text-brand-slate">├── 📁 broker/ <span className="text-[9px] text-brand-slate">(Broker interfaces)</span></div>
                <div className="pl-8 text-brand-slate">└── 📁 [8 other core packages...]</div>
                
                <div className="pl-4 text-brand-gold">📄 pnpm-workspace.yaml</div>
                <div className="pl-4">📄 package.json</div>
              </div>
            </section>

            {/* Next Roadmaps */}
            <section className="bg-brand-panel border border-brand-border rounded-lg p-5">
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="w-5 h-5 text-brand-gold" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Future Sprints Roadmap</h2>
              </div>
              <div className="space-y-4">
                <div className="border-l-2 border-brand-gold/30 pl-3.5 relative space-y-1">
                  <div className="w-2 h-2 rounded-full bg-brand-gold absolute -left-[5px] top-1.5" />
                  <h4 className="text-xs font-bold text-white">Sprint 3: Relational Persistence</h4>
                  <p className="text-[10px] text-brand-text-muted leading-relaxed">
                    Set up PostgreSQL database schemas (Cloud SQL) and map persistent repositories in `@tradeflow/storage`.
                  </p>
                </div>
                <div className="border-l-2 border-brand-border pl-3.5 relative space-y-1">
                  <div className="w-2 h-2 rounded-full bg-brand-slate absolute -left-[5px] top-1.5" />
                  <h4 className="text-xs font-bold text-brand-text-muted">Sprint 4: WebSocket Streamers</h4>
                  <p className="text-[10px] text-brand-slate leading-relaxed">
                    Introduce live brokerage ticker client adaptors under `@tradeflow/market-data` for low-latency live quotes.
                  </p>
                </div>
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}
