export type TradingIntentAction =
  | 'BUY'
  | 'SELL'
  | 'CLOSE_POSITION'
  | 'MOVE_STOP'
  | 'MOVE_TARGET'
  | 'REDUCE_POSITION'
  | 'INCREASE_POSITION'
  | 'NO_ACTION';

export interface TradingIntent {
  id: string;
  strategyId: string;
  symbol: string;
  action: TradingIntentAction;
  timeframe?: string;
  quantity?: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}
