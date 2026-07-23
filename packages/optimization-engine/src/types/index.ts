import { Candle } from '@tradeflow/shared';
import { BacktestReportMetrics, BacktestSnapshotData } from '@tradeflow/backtesting-engine';

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
  includeSnapshots?: boolean;
}

export interface OptimizationResultItem {
  id: string;
  parameters: ParameterSet;
  parameterHash?: string;
  datasetHash?: string;
  metrics: BacktestReportMetrics;
  rank: number;
  seed: number;
  executionDurationMs: number;
  timestamp: string;
  snapshotId?: string;
  snapshot?: BacktestSnapshotData;
}

export interface OptimizationProgressData {
  completedRuns: number;
  totalRuns: number;
  remainingRuns: number;
  percentage: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
  estimatedRemainingTime: number;
  averageRunDurationMs: number;
  averageRunDuration: number;
  estimatedCompletionTime?: string;
  throughputRunsPerSecond: number;
  currentParameters?: ParameterSet;
}

export interface OptimizationSession {
  sessionId: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  status: OptimizationState;
  datasetHash: string;
  seed: number;
  runCount: number;
  completedRuns: number;
  cancelledRuns: number;
  failedRuns: number;
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
  session?: OptimizationSession;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}
