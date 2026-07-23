import { Candle } from '@tradeflow/shared';
import { ValidationResult } from '@tradeflow/trading-domain';

export type BacktestState =
  | 'IDLE'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'STOPPED'
  | 'ERROR';

export type PlaybackSpeed = '1x' | '2x' | '4x' | '10x' | 'UNLIMITED';

export interface BacktestConfig {
  symbol: string;
  timeframe: string;
  initialBalance?: number;
  playbackSpeed?: PlaybackSpeed;
  maxCandleHistory?: number;
}

export interface BacktestReportMetrics {
  startDate: string;
  endDate: string;
  totalCandles: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  expectancy: number;
  sharpeRatio: number;
  sortinoRatio: number;
  initialBalance: number;
  finalBalance: number;
  finalEquity: number;
}

export interface BacktestSnapshotData {
  state: BacktestState;
  currentIndex: number;
  currentTime: string;
  speed: PlaybackSpeed;
  candlesCount: number;
  timestamp: string;
}

export type { ValidationResult };
