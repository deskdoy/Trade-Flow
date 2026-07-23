export { PortfolioEngine } from './core/PortfolioEngine.ts';
export { PositionBook } from './positions/PositionBook.ts';
export { HoldingsManager } from './holdings/HoldingsManager.ts';
export { EquityCurve } from './equity/EquityCurve.ts';
export { PerformanceTracker } from './pnl/PerformanceTracker.ts';
export { StatisticsEngine } from './statistics/StatisticsEngine.ts';
export { PortfolioSnapshot } from './snapshots/PortfolioSnapshot.ts';
export { PortfolioEventEmitter } from './events/PortfolioEvents.ts';

export type {
  PortfolioEventPayloadMap,
  PortfolioEventType,
  PortfolioEventListener,
} from './events/PortfolioEvents.ts';

export type {
  ClosedPositionRecord,
  HoldingsData,
  EquityPoint,
  DailyEquityPoint,
  EquityData,
  PerformanceMetrics,
  TradingStatistics,
  PortfolioSnapshotData,
  PortfolioEngineOptions,
} from './types/index.ts';
