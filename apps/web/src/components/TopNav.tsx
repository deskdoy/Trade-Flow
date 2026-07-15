import React from "react";
import { TrendingUp, Shield, HelpCircle, User, Bell, ChevronDown, DollarSign } from "lucide-react";
import { AccountInfo } from "@/packages/shared/src/types/index";
import { formatCurrency } from "@/packages/shared/src/utils/index";

interface TopNavProps {
  account: AccountInfo | null;
  isLoading: boolean;
}

export default function TopNav({ account, isLoading }: TopNavProps) {
  return (
    <header className="h-14 border-b border-brand-border bg-brand-header text-brand-text px-4 flex items-center justify-between select-none z-10">
      {/* Brand Logo */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded bg-brand-gold flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-brand-bg" />
        </div>
        <div>
          <span className="font-sans font-bold tracking-tight text-lg text-white uppercase">
            Trade<span className="text-brand-gold">Flow</span>
          </span>
          <span className="ml-2 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-brand-border text-brand-text-muted border border-brand-border">
            PRO v1.0
          </span>
        </div>
      </div>

      {/* Account Financials Readout */}
      <div className="hidden lg:flex items-center space-x-8 bg-brand-panel px-4 py-1.5 rounded border border-brand-border">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-brand-text-muted font-medium">Balance</div>
          <div className="text-xs font-mono font-bold text-white">
            {isLoading || !account ? "—" : formatCurrency(account.balance)}
          </div>
        </div>
        <div className="h-6 w-px bg-brand-border" />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-brand-text-muted font-medium">Equity</div>
          <div className="text-xs font-mono font-bold text-brand-gold">
            {isLoading || !account ? "—" : formatCurrency(account.equity)}
          </div>
        </div>
        <div className="h-6 w-px bg-brand-border" />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-brand-text-muted font-medium">Free Margin</div>
          <div className="text-xs font-mono font-bold text-brand-green">
            {isLoading || !account ? "—" : formatCurrency(account.freeMargin)}
          </div>
        </div>
        <div className="h-6 w-px bg-brand-border" />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-brand-text-muted font-medium">Leverage</div>
          <div className="text-xs font-mono font-bold text-brand-text">1:100</div>
        </div>
      </div>

      {/* User Actions & System Alerts */}
      <div className="flex items-center space-x-4">
        {/* Connection Status Indicator */}
        <div className="flex items-center space-x-2 px-3 py-1 bg-brand-border-dark rounded-full border border-brand-border">
          <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
          <span className="text-[10px] text-brand-text-muted font-mono">LIVE FEED</span>
        </div>

        <button className="p-2 text-brand-text-muted hover:text-white rounded hover:bg-brand-border transition-all cursor-pointer relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-gold rounded-full" />
        </button>

        <button className="p-2 text-brand-text-muted hover:text-white rounded hover:bg-brand-border transition-all cursor-pointer">
          <Shield className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-brand-border" />

        {/* Profile Dropdown */}
        <div className="flex items-center space-x-2 pl-1 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-brand-border-dark border border-brand-border flex items-center justify-center text-xs font-mono font-bold text-brand-gold">
            TF
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-medium text-brand-text group-hover:text-white">Senior Trader</div>
            <div className="text-[9px] text-brand-text-muted font-mono">rajjdoy@gmail.com</div>
          </div>
          <ChevronDown className="w-4 h-4 text-brand-text-muted group-hover:text-brand-text transition-all" />
        </div>
      </div>
    </header>
  );
}
