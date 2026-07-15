import React, { useState } from "react";
import { FolderLock, FileText, ClipboardList, ShieldAlert, X } from "lucide-react";
import { Order, Position, OrderStatus } from "@/packages/shared/src/types/index";
import { formatCurrency, formatPercent } from "@/packages/shared/src/utils/index";

interface PositionsListProps {
  positions: Position[];
  orders: Order[];
  onCancelOrder: (id: string) => void;
  isLoading: boolean;
}

export default function PositionsList({ positions, orders, onCancelOrder, isLoading }: PositionsListProps) {
  const [activeTab, setActiveTab] = useState<"positions" | "orders" | "history">("positions");

  const pendingOrders = orders.filter((o) => o.status === OrderStatus.PENDING);
  const historicOrders = orders.filter((o) => o.status !== OrderStatus.PENDING);

  return (
    <div className="flex-1 bg-brand-panel border border-brand-border rounded flex flex-col overflow-hidden shadow-lg select-none">
      {/* List Tab Switcher */}
      <div className="h-11 border-b border-brand-border bg-brand-header px-4 flex items-center justify-between">
        <div className="flex space-x-6 h-full">
          {[
            { id: "positions", label: "Open Positions", count: positions.length, icon: FolderLock },
            { id: "orders", label: "Active Orders", count: pendingOrders.length, icon: ClipboardList },
            { id: "history", label: "Order Logs", count: historicOrders.length, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative h-full flex items-center space-x-2 text-xs font-semibold cursor-pointer transition-all ${
                  isActive ? "text-brand-gold font-bold" : "text-brand-text-muted hover:text-brand-text"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  isActive ? "bg-brand-gold/15 text-brand-gold border border-brand-gold/30" : "bg-brand-border text-brand-slate"
                }`}>
                  {tab.count}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold rounded" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tables Container */}
      <div className="flex-1 overflow-auto p-4 bg-brand-bg/20">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center text-xs font-mono text-brand-slate">
            Fetching active trade matrices...
          </div>
        ) : activeTab === "positions" ? (
          positions.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-brand-border rounded">
              <FolderLock className="w-6 h-6 text-brand-slate" />
              <p className="text-xs text-brand-slate font-medium font-serif italic">No open positions in your active portfolio</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="text-brand-slate font-sans font-bold border-b border-brand-border pb-2">
                    <th className="pb-2">Asset Symbol</th>
                    <th className="pb-2">Direction</th>
                    <th className="pb-2 text-right">Size</th>
                    <th className="pb-2 text-right">Entry Price</th>
                    <th className="pb-2 text-right">Current Value</th>
                    <th className="pb-2 text-right">Unrealized P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40">
                  {positions.map((pos, index) => {
                    const isLong = pos.quantity >= 0;
                    const pnlColor = pos.unrealizedPnl >= 0 ? "text-brand-green" : "text-brand-red";
                    const pnlSign = pos.unrealizedPnl >= 0 ? "+" : "";

                    return (
                      <tr key={`${pos.symbol}-${index}`} className="hover:bg-brand-hover/30 transition-all">
                        <td className="py-2.5 font-bold text-brand-text">{pos.symbol}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isLong ? "bg-brand-green/10 text-brand-green border border-brand-green/20" : "bg-brand-red/10 text-brand-red border border-brand-red/20"
                          }`}>
                            {isLong ? "BUY" : "SELL"}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-bold text-brand-text">
                          {Math.abs(pos.quantity).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 4 })}
                        </td>
                        <td className="py-2.5 text-right text-brand-text-muted">
                          {formatCurrency(pos.averageEntryPrice)}
                        </td>
                        <td className="py-2.5 text-right text-brand-text">
                          {formatCurrency(pos.marketValue)}
                        </td>
                        <td className={`py-2.5 text-right font-bold ${pnlColor}`}>
                          {pnlSign}{formatCurrency(pos.unrealizedPnl)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === "orders" ? (
          pendingOrders.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-brand-border rounded">
              <ClipboardList className="w-6 h-6 text-brand-slate" />
              <p className="text-xs text-brand-slate font-medium font-serif italic">No active limit or stop orders currently waiting</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="text-brand-slate font-sans font-bold border-b border-brand-border pb-2">
                    <th className="pb-2">Order ID</th>
                    <th className="pb-2">Asset</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Side</th>
                    <th className="pb-2 text-right">Size</th>
                    <th className="pb-2 text-right">Limit Price</th>
                    <th className="pb-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40">
                  {pendingOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-brand-hover/30 transition-all">
                      <td className="py-2.5 text-brand-slate font-bold">{order.id}</td>
                      <td className="py-2.5 text-brand-text font-bold">{order.symbol}</td>
                      <td className="py-2.5 text-brand-gold font-bold text-[10px]">{order.type}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          order.side === "BUY" ? "bg-brand-green/10 text-brand-green border border-brand-green/20" : "bg-brand-red/10 text-brand-red border border-brand-red/20"
                        }`}>
                          {order.side}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-brand-text">
                        {order.quantity.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 4 })}
                      </td>
                      <td className="py-2.5 text-right text-brand-text font-bold">
                        {order.price > 0 ? formatCurrency(order.price) : "MARKET"}
                      </td>
                      <td className="py-2.5 text-center">
                        <button
                          onClick={() => onCancelOrder(order.id)}
                          className="p-1 text-brand-text-muted hover:text-brand-red hover:bg-brand-red/10 rounded border border-transparent hover:border-brand-red/20 transition-all cursor-pointer"
                          title="Cancel Order"
                        >
                          <X className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          historicOrders.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-brand-border rounded">
              <FileText className="w-6 h-6 text-brand-slate" />
              <p className="text-xs text-brand-slate font-medium font-serif italic">Your historical order logs are empty</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="text-brand-slate font-sans font-bold border-b border-brand-border pb-2">
                    <th className="pb-2">Time (UTC)</th>
                    <th className="pb-2">ID</th>
                    <th className="pb-2">Asset</th>
                    <th className="pb-2">Side</th>
                    <th className="pb-2 text-right">Size</th>
                    <th className="pb-2 text-right">Price</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40">
                  {historicOrders.map((order) => {
                    let statusColor = "text-brand-slate";
                    if (order.status === "FILLED") statusColor = "text-brand-green bg-brand-green/10 border border-brand-green/20";
                    if (order.status === "CANCELLED") statusColor = "text-brand-text-muted bg-brand-border border border-brand-border";
                    if (order.status === "REJECTED") statusColor = "text-brand-red bg-brand-red/10 border border-brand-red/20";

                    return (
                      <tr key={order.id} className="hover:bg-brand-hover/30 transition-all text-brand-text-muted">
                        <td className="py-2.5 text-[10px] text-brand-slate">
                          {new Date(order.timestamp).toISOString().replace("T", " ").substring(0, 19)}
                        </td>
                        <td className="py-2.5 text-brand-slate font-semibold">{order.id}</td>
                        <td className="py-2.5 text-brand-text font-bold">{order.symbol}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            order.side === "BUY" ? "bg-brand-green/10 text-brand-green border border-brand-green/20" : "bg-brand-red/10 text-brand-red border border-brand-red/20"
                          }`}>
                            {order.side}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-bold text-brand-text">
                          {order.quantity.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 4 })}
                        </td>
                        <td className="py-2.5 text-right font-bold text-brand-text">
                          {formatCurrency(order.price)}
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${statusColor}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
