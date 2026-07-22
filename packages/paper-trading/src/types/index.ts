import {
  MarginMode,
  OrderData,
  OrderSide,
  OrderStatus,
  OrderType,
  PositionData,
  TimeInForce,
  TradeData,
} from '@tradeflow/trading-domain';

export interface PaperAccountConfig {
  initialBalance: number;
  currency?: string;
  marginMode?: MarginMode;
  defaultLeverage?: number;
}

export interface PaperOrderParams {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: TimeInForce;
  clientOrderId?: string;
}

export interface PaperAccountState {
  balance: number;
  equity: number;
  usedMargin: number;
  freeMargin: number;
  floatingPnL: number;
  currency: string;
}

export interface CandleData {
  symbol: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface PriceTick {
  symbol: string;
  price: number;
  timestamp?: string;
}

export interface FillResult {
  canFill: boolean;
  fillPrice?: number;
}

export interface OrderExecutionResult {
  filledOrder: OrderData;
  trade: TradeData;
}

export interface PositionUpdateResult {
  position: PositionData;
  isNew: boolean;
  isClosed: boolean;
  realizedPnL: number;
}
