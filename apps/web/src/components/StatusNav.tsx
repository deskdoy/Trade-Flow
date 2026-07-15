import React, { useEffect, useState } from "react";
import { Server, Activity, Clock, Database, Radio } from "lucide-react";
import { HealthStatus } from "@/apps/api/src/services/health";

interface StatusNavProps {
  apiHealth: HealthStatus | null;
  pingMs: number | null;
}

export default function StatusNav({ apiHealth, pingMs }: StatusNavProps) {
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const timer = setInterval(() => {
      // Professional trading platforms display standard UTC time
      const utcString = new Date().toUTCString().replace("GMT", "UTC");
      setCurrentTime(utcString);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="h-9 border-t border-brand-border bg-brand-header px-4 text-brand-slate font-mono text-[10px] flex items-center justify-between select-none">
      {/* Left Details: API status */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <Server className="w-3.5 h-3.5 text-brand-slate" />
          <span>Server:</span>
          <span className="text-brand-text font-bold">
            {apiHealth ? `${apiHealth.system.platform.toUpperCase()}` : "CONNECTING..."}
          </span>
        </div>

        <div className="h-4 w-px bg-brand-border" />

        <div className="flex items-center space-x-2">
          <Activity className="w-3.5 h-3.5 text-brand-slate" />
          <span>Latency:</span>
          <span className={pingMs !== null && pingMs < 100 ? "text-brand-green font-bold" : "text-brand-gold"}>
            {pingMs !== null ? `${pingMs}ms` : "—"}
          </span>
        </div>

        <div className="h-4 w-px bg-brand-border" />

        <div className="flex items-center space-x-2">
          <Database className="w-3.5 h-3.5 text-brand-slate" />
          <span>Database:</span>
          <span className="text-brand-slate">PostgreSQL (Standby)</span>
        </div>
      </div>

      {/* Right Details: Time and Connection state */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 text-brand-text-muted">
          <Clock className="w-3.5 h-3.5 text-brand-slate" />
          <span className="text-brand-text font-bold">{currentTime || "Loading UTC..."}</span>
        </div>

        <div className="h-4 w-px bg-brand-border" />

        <div className="flex items-center space-x-1.5 bg-brand-green/10 text-brand-green px-2 py-0.5 rounded border border-brand-green/20">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span className="font-bold">SECURE CHANNEL</span>
        </div>
      </div>
    </footer>
  );
}
