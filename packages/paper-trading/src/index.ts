export { PaperTradingEngine } from './core/PaperTradingEngine.ts';
export { OrderManager } from './orders/OrderManager.ts';
export { OrderExecutor } from './orders/OrderExecutor.ts';
export { FillSimulator } from './orders/FillSimulator.ts';
export { PositionManager } from './positions/PositionManager.ts';
export { AccountManager } from './account/AccountManager.ts';
export { UnrealizedPnL } from './pnl/UnrealizedPnL.ts';
export { RealizedPnL } from './pnl/RealizedPnL.ts';
export { PaperTradingEventEmitter } from './events/PaperTradingEvents.ts';

export type {
  PaperTradingEventPayloadMap,
  PaperTradingEventType,
  PaperTradingEventListener,
} from './events/PaperTradingEvents.ts';

export type {
  PaperAccountConfig,
  PaperOrderParams,
  PaperAccountState,
  CandleData,
  PriceTick,
  FillResult,
  OrderExecutionResult,
  PositionUpdateResult,
} from './types/index.ts';
