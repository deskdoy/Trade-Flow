export { OptimizationEngine } from './core/OptimizationEngine.ts';
export type { OptimizationEngineOptions } from './core/OptimizationEngine.ts';

export { OptimizationRunner } from './runner/OptimizationRunner.ts';
export type { StrategyFactory } from './runner/OptimizationRunner.ts';

export { ParameterSpace } from './parameters/ParameterSpace.ts';
export { ParameterGenerator } from './parameters/ParameterGenerator.ts';
export { ParameterValidator } from './parameters/ParameterValidator.ts';

export { ResultRanking } from './ranking/ResultRanking.ts';
export type { CustomComparator } from './ranking/ResultRanking.ts';

export { ProgressTracker } from './progress/ProgressTracker.ts';
export { OptimizationReport } from './reports/OptimizationReport.ts';
export { CancellationToken } from './cancellation/CancellationToken.ts';
export { OptimizationEventEmitter } from './events/OptimizationEvents.ts';
export { OptimizationSnapshot } from './snapshots/OptimizationSnapshot.ts';

export type {
  OptimizationMode,
  OptimizationState,
  ParameterType,
  NumericParameterRange,
  CategoricalParameterRange,
  ParameterRange,
  ParameterSet,
  RankingMetric,
  OptimizationConfig,
  OptimizationResultItem,
  OptimizationProgressData,
  OptimizationSnapshotData,
} from './types/index.ts';

export type {
  OptimizationEventPayloadMap,
  OptimizationEventType,
  OptimizationEventListener,
} from './events/OptimizationEvents.ts';
