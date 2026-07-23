export { BacktestingEngine } from './core/BacktestingEngine.ts';
export type { BacktestingEngineOptions } from './core/BacktestingEngine.ts';

export { BacktestRunner } from './runner/BacktestRunner.ts';
export { SimulationClock } from './timeline/SimulationClock.ts';
export { HistoricalDataset } from './dataset/HistoricalDataset.ts';
export { PlaybackController } from './playback/PlaybackController.ts';
export { BacktestStatistics } from './statistics/BacktestStatistics.ts';
export { BacktestReport } from './report/BacktestReport.ts';
export { BacktestValidator } from './validation/BacktestValidator.ts';
export { BacktestEventEmitter } from './events/BacktestEvents.ts';

export type {
  BacktestConfig,
  BacktestState,
  PlaybackSpeed,
  PlaybackMode,
  BacktestReportMetrics,
  BacktestSnapshotData,
  ValidationResult,
} from './types/index.ts';

export type {
  BacktestEventPayloadMap,
  BacktestEventType,
  BacktestEventListener,
} from './events/BacktestEvents.ts';
