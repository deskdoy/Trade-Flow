import React from "react";
import { 
  LayoutDashboard, 
  TrendingUp, 
  FolderLock, 
  BarChart4, 
  Layers, 
  History, 
  Settings, 
  LogOut,
  HelpCircle,
  FileText
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Trading Desk", icon: LayoutDashboard },
    { id: "markets", label: "Market Watch", icon: TrendingUp },
    { id: "positions", label: "Open Portfolio", icon: FolderLock },
    { id: "indicators", label: "Analytics & Indicators", icon: BarChart4 },
    { id: "logs", label: "Trade Journals", icon: FileText },
  ];

  return (
    <aside className="w-64 border-r border-brand-border bg-brand-panel text-brand-text-muted flex flex-col justify-between select-none">
      {/* Upper Navigation List */}
      <div className="p-4 flex-1">
        <div className="text-[10px] font-bold text-brand-slate uppercase tracking-wider px-3 mb-4 font-serif italic">
          Core Workspace
        </div>
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-brand-gold/10 text-brand-gold border border-brand-gold/35"
                    : "hover:bg-brand-hover hover:text-brand-text border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-brand-gold" : "text-brand-slate"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="h-px bg-brand-border my-6" />

        <div className="text-[10px] font-bold text-brand-slate uppercase tracking-wider px-3 mb-4 font-serif italic">
          General Configurations
        </div>
        <nav className="space-y-1.5">
          <button 
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded text-sm font-medium transition-all cursor-pointer ${
              activeTab === "settings"
                ? "bg-brand-gold/10 text-brand-gold border border-brand-gold/35"
                : "hover:bg-brand-hover hover:text-brand-text border border-transparent"
            }`}
          >
            <Settings className="w-4 h-4 text-brand-slate" />
            <span>Settings</span>
          </button>
          <a
            href="/api/health"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded text-sm font-medium hover:bg-brand-hover hover:text-brand-text transition-all cursor-pointer border border-transparent"
          >
            <HelpCircle className="w-4 h-4 text-brand-slate" />
            <span>API Docs & Health</span>
          </a>
        </nav>
      </div>

      {/* Footer Meta Details */}
      <div className="p-4 border-t border-brand-border bg-brand-header text-center">
        <div className="flex items-center justify-between text-[10px] font-mono text-brand-slate">
          <span>Engine Status</span>
          <span className="text-brand-green font-bold flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green mr-1 animate-pulse" />
            ONLINE
          </span>
        </div>
      </div>
    </aside>
  );
}
