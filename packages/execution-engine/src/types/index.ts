import {
  MarginMode,
  OrderData,
  OrderSide,
  OrderType,
  PositionData,
  TimeInForce,
} from '@tradeflow/trading-domain';
import { PaperAccountState } from '@tradeflow/paper-trading';

export type ExecutionTargetType = 'paper' | 'replay' | 'backtest' | 'broker' | string;

export enum ExecutionStatus {
  QUEUED = 'QUEUED',
  STARTED = 'STARTED',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  TIMEOUT = 'TIMEOUT',
}

export enum AcknowledgementStatus {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
  TIMEOUT = 'TIMEOUT',
  FAILED = 'FAILED',
}

export interface ExecutionOrderRequest {
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
  targetType?: ExecutionTargetType;
}

export interface ExecutionRequest {
  requestId: string;
  orderRequest: ExecutionOrderRequest;
  targetId?: string;
  targetType?: ExecutionTargetType;
  timestamp: string;
  options?: Record<string, unknown>;
}

export interface ExecutionAcknowledgementData {
  requestId: string;
  targetId: string;
  status: AcknowledgementStatus;
  timestamp: string;
  message?: string;
  rejectionReasons?: string[];
}

export interface ExecutionResult {
  requestId: string;
  orderId?: string;
  clientOrderId?: string;
  targetId: string;
  status: ExecutionStatus;
  acknowledgement: ExecutionAcknowledgementData;
  orderData?: OrderData;
  error?: string;
  timestamp: string;
  executionDurationMs?: number;
}
