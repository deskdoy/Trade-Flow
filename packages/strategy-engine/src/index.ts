export { StrategyEngine } from './core/StrategyEngine.ts';
export { StrategyRegistry } from './registry/StrategyRegistry.ts';
export { BaseStrategy } from './strategies/BaseStrategy.ts';
export { MovingAverageCrossStrategy } from './strategies/MovingAverageCrossStrategy.ts';
export { BuyAndHoldStrategy } from './strategies/BuyAndHoldStrategy.ts';
export { SignalGenerator } from './signals/SignalGenerator.ts';
export { StrategyValidator } from './validation/StrategyValidator.ts';

export type {
  Strategy,
  StrategyMetadata,
  TradingIntent,
  TradingIntentAction,
  StrategyContext,
} from './types/index.ts';

export type {
  StrategyEventPayloadMap,
  StrategyEventType,
  StrategyEventListener,
} from './events/StrategyEvents.ts';
