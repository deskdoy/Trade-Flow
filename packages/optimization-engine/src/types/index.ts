import { Candle } from '@tradeflow/shared';
import { BacktestReportMetrics } from '@tradeflow/backtesting-engine';

export type OptimizationMode = 'GRID_SEARCH' | 'RANDOM_SEARCH';

export type OptimizationState =
  | 'IDLE'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ERROR';

export type ParameterType = 'NUMBER' | 'CATEGORY';

export interface NumericParameterRange {
  name: string;
  type: 'NUMBER';
  min: number;
  max: number;
  step: number;
}

export interface CategoricalParameterRange {
  name: string;
  type: 'CATEGORY';
  options: (string | number | boolean)[];
}

export type ParameterRange = NumericParameterRange | CategoricalParameterRange;

export type ParameterSet = Record<string, any>;

export type RankingMetric =
  | 'netProfit'
  | 'maxDrawdown'
  | 'maxDrawdownPercent'
  | 'profitFactor'
  | 'winRate'
  | 'expectancy'
  | 'sharpeRatio'
  | 'sortinoRatio';

export interface OptimizationConfig {
  mode: OptimizationMode;
  symbol: string;
  timeframe: string;
  initialBalance?: number;
  maxCandleHistory?: number;
  randomSearchSamples?: number;
  rankingMetric?: RankingMetric;
  seed?: number;
}

export interface OptimizationResultItem {
  id: string;
  parameters: ParameterSet;
  metrics: BacktestReportMetrics;
  rank: number;
  seed: number;
  executionDurationMs: number;
  timestamp: string;
}

export interface OptimizationProgressData {
  completedRuns: number;
  totalRuns: number;
  remainingRuns: number;
  percentage: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
  currentParameters?: ParameterSet;
}

export interface OptimizationSnapshotData {
  version: number;
  engineVersion: string;
  schemaVersion: number;
  state: OptimizationState;
  completedRuns: number;
  totalRuns: number;
  results: OptimizationResultItem[];
  progress: OptimizationProgressData;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}
