import {
  MarginMode,
  OrderData,
  OrderSide,
  OrderType,
  PositionSide,
  TimeInForce,
} from '@tradeflow/trading-domain';

export enum OMSOrderState {
  NEW = 'NEW',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ROUTED = 'ROUTED',
  FILLED = 'FILLED',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

export interface OrderRequest {
  id?: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: TimeInForce;
  leverage?: number;
  marginMode?: MarginMode;
  stopLoss?: number;
  takeProfit?: number;
  targetId?: string;
}

export interface OrderModificationRequest {
  orderId: string;
  newQuantity?: number;
  newPrice?: number;
  newStopPrice?: number;
}

export interface ClosePositionParams {
  symbol: string;
  quantity?: number;
  targetId?: string;
}

export interface PartialCloseParams {
  symbol: string;
  closeQuantity: number;
  targetId?: string;
}

export interface ReversePositionParams {
  symbol: string;
  targetId?: string;
}

export interface OMSOrderRecord {
  id: string;
  clientOrderId: string;
  request: OrderRequest;
  state: OMSOrderState;
  createdAt: string;
  updatedAt: string;
  rejectionReasons?: string[];
  executionResult?: OrderData;
  routedTargetId?: string;
}

export interface OMSOperationResult {
  success: boolean;
  orderId?: string;
  clientOrderId?: string;
  state?: OMSOrderState;
  reasons?: string[];
  executionResult?: OrderData;
  orderRecord?: OMSOrderRecord;
}

export interface OrderValidationResult {
  approved: boolean;
  reasons: string[];
}
