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

export type PlaybackMode = 'RUN' | 'REPLAY';

export interface BacktestConfig {
  symbol: string;
  timeframe: string;
  initialBalance?: number;
  playbackSpeed?: PlaybackSpeed;
  maxCandleHistory?: number;
  seed?: number;
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

  // Sprint 14.1 simulation metadata additions
  simulationDuration: number;
  processedCandles: number;
  averageCandlesPerSecond: number;
  playbackMode: PlaybackMode;
  seed: number;
}

export interface BacktestSnapshotData {
  version?: number;
  engineVersion?: string;
  schemaVersion?: number;
  seed: number;
  state: BacktestState;
  currentIndex: number;
  currentTime: string;
  speed: PlaybackSpeed;
  candlesCount: number;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
}

export type { ValidationResult };
