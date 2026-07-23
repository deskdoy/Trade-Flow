export { OrderManagementEngine } from './core/OrderManagementEngine.ts';
export { OrderManager } from './manager/OrderManager.ts';
export { OrderRouter } from './routing/OrderRouter.ts';
export { PaperTradingTarget } from './routing/ExecutionTarget.ts';
export type { ExecutionTarget } from './routing/ExecutionTarget.ts';
export { OrderLifecycle } from './lifecycle/OrderLifecycle.ts';
export { OrderStateMachine } from './lifecycle/OrderStateMachine.ts';
export { OrderRequestValidator } from './validation/OrderRequestValidator.ts';
export { OrderEventEmitter } from './events/OrderEvents.ts';

export type {
  OrderEventPayloadMap,
  OrderEventType,
  OrderEventListener,
} from './events/OrderEvents.ts';

export { OMSOrderState } from './types/index.ts';
export type {
  OrderRequest,
  OrderModificationRequest,
  ClosePositionParams,
  PartialCloseParams,
  ReversePositionParams,
  OMSOrderRecord,
  OMSOperationResult,
  OrderValidationResult,
} from './types/index.ts';
