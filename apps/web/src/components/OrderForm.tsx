import React, { useState, useEffect } from "react";
import { DollarSign, ShieldAlert, CheckCircle2, TrendingUp } from "lucide-react";
import { OrderType, OrderSide } from "@/packages/shared/src/types/index";
import { MarketData } from "@/packages/shared/src/types/index";
import { formatCurrency } from "@/packages/shared/src/utils/index";

interface OrderFormProps {
  selectedSymbol: string;
  ticker: MarketData | null;
  onOrderSuccess: () => void;
}

export default function OrderForm({ selectedSymbol, ticker, onOrderSuccess }: OrderFormProps) {
  const [side, setSide] = useState<OrderSide>(OrderSide.BUY);
  const [type, setType] = useState<OrderType>(OrderType.MARKET);
  const [price, setPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto fill price input if Limit type selected
  useEffect(() => {
    if (ticker) {
      if (type === OrderType.LIMIT && !price) {
        setPrice(ticker.last.toString());
      } else if (type === OrderType.MARKET) {
        setPrice("");
      }
    }
  }, [type, ticker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setErrorMsg("Quantity must be a positive number");
      return;
    }

    let priceNum = 0;
    if (type !== OrderType.MARKET) {
      priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        setErrorMsg("Price must be a valid number greater than 0");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/trade/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedSymbol,
          type,
          side,
          price: type === OrderType.MARKET ? undefined : priceNum,
          quantity: qtyNum,
        }),
      });

      const resJson = await response.json();
      if (!resJson.success) {
        throw new Error(resJson.error || "Order execution failed");
      }

      setSuccessMsg(`Order placed successfully: ${side} ${quantity} ${selectedSymbol}`);
      onOrderSuccess(); // trigger refetching positions/orders in parent App

      // reset form quantity
      setQuantity("1");
      if (type === OrderType.LIMIT && ticker) {
        setPrice(ticker.last.toString());
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong placing the order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedValue = ticker
    ? (type === OrderType.MARKET ? ticker.last : parseFloat(price) || 0) * (parseFloat(quantity) || 0)
    : 0;

  return (
    <div className="w-80 bg-brand-panel border border-brand-border rounded flex flex-col overflow-hidden shadow-lg select-none">
      {/* Side Selector Buttons */}
      <div className="flex h-12 p-1 bg-brand-header border-b border-brand-border space-x-1">
        <button
          type="button"
          onClick={() => setSide(OrderSide.BUY)}
          className={`flex-1 rounded text-xs font-bold transition-all duration-150 cursor-pointer ${
            side === OrderSide.BUY
              ? "bg-brand-green text-brand-bg shadow-lg shadow-brand-green/10"
              : "text-brand-text-muted hover:text-brand-text"
          }`}
        >
          BUY (LONG)
        </button>
        <button
          type="button"
          onClick={() => setSide(OrderSide.SELL)}
          className={`flex-1 rounded text-xs font-bold transition-all duration-150 cursor-pointer ${
            side === OrderSide.SELL
              ? "bg-brand-red text-white shadow-lg shadow-brand-red/10"
              : "text-brand-text-muted hover:text-brand-text"
          }`}
        >
          SELL (SHORT)
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 flex-1 flex flex-col justify-between space-y-4">
        {/* Order Types */}
        <div className="flex space-x-1.5 p-0.5 bg-brand-bg rounded border border-brand-border">
          {[OrderType.MARKET, OrderType.LIMIT].map((oType) => (
            <button
              key={oType}
              type="button"
              onClick={() => setType(oType)}
              className={`flex-1 py-1.5 rounded text-xs font-semibold cursor-pointer transition-all ${
                type === oType
                  ? "bg-brand-border text-brand-gold font-bold border border-brand-slate/40"
                  : "text-brand-text-muted hover:text-brand-text"
              }`}
            >
              {oType}
            </button>
          ))}
        </div>

        {/* Form Input fields */}
        <div className="space-y-3.5">
          {/* Price field (Conditional) */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-brand-text-muted font-bold mb-1.5">
              Limit price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-brand-slate font-mono text-xs">$</span>
              <input
                type="number"
                disabled={type === OrderType.MARKET}
                value={type === OrderType.MARKET ? ticker?.last.toFixed(2) || "" : price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                step="any"
                className={`w-full bg-brand-bg border text-xs font-mono font-bold text-brand-text pl-7 pr-3 py-2 rounded outline-none transition-all ${
                  type === OrderType.MARKET
                    ? "opacity-50 border-brand-border text-brand-slate cursor-not-allowed bg-brand-panel"
                    : "border-brand-border focus:border-brand-gold"
                }`}
              />
              {type === OrderType.MARKET && (
                <span className="absolute right-3 top-2.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-border text-brand-slate border border-brand-border">
                  MARKET PRICE
                </span>
              )}
            </div>
          </div>

          {/* Quantity field */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-brand-text-muted font-bold mb-1.5">
              Order Size (Qty)
            </label>
            <div className="relative">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1.00"
                step="any"
                min="0.0001"
                className="w-full bg-brand-bg border border-brand-border focus:border-brand-gold text-xs font-mono font-bold text-brand-text px-3 py-2 rounded outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Valuation Information */}
        <div className="bg-brand-header/50 p-3 rounded border border-brand-border space-y-2 text-xs font-mono text-brand-text-muted">
          <div className="flex justify-between">
            <span>Est. Order Value</span>
            <span className="text-white font-bold">{formatCurrency(estimatedValue)}</span>
          </div>
          <div className="flex justify-between">
            <span>Commission (0.01%)</span>
            <span>{formatCurrency(estimatedValue * 0.0001)}</span>
          </div>
          <div className="h-px bg-brand-border my-1" />
          <div className="flex justify-between text-brand-text font-sans">
            <span className="font-semibold text-[11px]">Required Margin</span>
            <span className="text-white font-bold font-mono">
              {formatCurrency(estimatedValue * 0.01)} {/* 1:100 leverage margin */}
            </span>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-2.5 bg-brand-red/10 border border-brand-red/30 rounded flex items-start space-x-2 text-xs text-brand-red">
            <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 bg-brand-green/10 border border-brand-green/30 rounded flex items-start space-x-2 text-xs text-brand-green">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Submission Button */}
        <button
          type="submit"
          disabled={isSubmitting || !ticker}
          className={`w-full py-3 rounded text-sm font-bold transition-all cursor-pointer shadow-lg ${
            !ticker
              ? "bg-brand-border text-brand-slate cursor-not-allowed border border-brand-border"
              : side === OrderSide.BUY
              ? "bg-brand-green text-brand-bg hover:brightness-110 shadow-brand-green/10"
              : "bg-brand-red text-white hover:brightness-110 shadow-brand-red/10"
          }`}
        >
          {isSubmitting ? "TRANSACTING..." : `${side} ${selectedSymbol}`}
        </button>
      </form>
    </div>
  );
}
