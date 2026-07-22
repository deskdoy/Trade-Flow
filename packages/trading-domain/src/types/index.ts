import {
  MarginMode,
  OrderSide,
  OrderStatus,
  OrderType,
  PositionSide,
  TimeInForce,
} from '../enums/index.ts';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface SymbolConfig {
  id: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  minQuantity: number;
  maxQuantity: number;
  stepSize: number;
  minNotional: number;
  status: 'TRADING' | 'HALTED' | 'BREAK';
}

export interface BalanceData {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

export interface AccountData {
  id: string;
  accountType: 'SPOT' | 'MARGIN' | 'FUTURES';
  marginMode: MarginMode;
  balances: BalanceData[];
  canTrade: boolean;
  updatedAt: string;
}

export interface OrderData {
  id: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  quantity: number;
  filledQuantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce: TimeInForce;
  createdAt: string;
  updatedAt: string;
  avgExecutionPrice?: number;
  tradeIds?: string[];
}

export interface TradeData {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  price: number;
  quantity: number;
  fee: number;
  feeAsset: string;
  timestamp: string;
}

export interface PositionData {
  id: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  markPrice?: number;
  unrealizedPnl: number;
  realizedPnl: number;
  marginMode: MarginMode;
  leverage: number;
  liquidationPrice?: number;
  openedAt: string;
  updatedAt: string;
  closedAt?: string;
  isOpen: boolean;
}
