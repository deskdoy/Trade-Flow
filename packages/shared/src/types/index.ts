export interface MarketData {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  high: number;
  low: number;
  volume: number;
  timestamp: string;
}

export enum OrderType {
  LIMIT = "LIMIT",
  MARKET = "MARKET",
  STOP = "STOP",
  STOP_LIMIT = "STOP_LIMIT",
}

export enum OrderSide {
  BUY = "BUY",
  SELL = "SELL",
}

export enum OrderStatus {
  PENDING = "PENDING",
  FILLED = "FILLED",
  CANCELLED = "CANCELLED",
  REJECTED = "REJECTED",
}

export interface Order {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  type: OrderType;
  side: OrderSide;
  status: OrderStatus;
  timestamp: string;
}

export interface Position {
  symbol: string;
  averageEntryPrice: number;
  quantity: number;
  marketValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
}

export interface AccountInfo {
  id: string;
  balance: number;
  equity: number;
  marginUsed: number;
  freeMargin: number;
  currency: string;
}

export interface Candle {
  time: string; // YYYY-MM-DD format or ISO string or string date
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface PricePoint {
  time: string;
  price: number;
}

export type ThemeMode = "dark" | "light";
