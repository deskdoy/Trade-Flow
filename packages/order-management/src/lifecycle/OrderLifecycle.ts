import { OMSOrderRecord, OMSOrderState, OrderRequest } from '../types/index.ts';
import { OrderStateMachine } from './OrderStateMachine.ts';

export class OrderLifecycle {
  /**
   * Creates a new order record in NEW state
   */
  public createOrderRecord(request: OrderRequest): OMSOrderRecord {
    const id = request.id || `oms_ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const clientOrderId = request.clientOrderId || `cli_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    return {
      id,
      clientOrderId,
      request: { ...request, id, clientOrderId },
      state: OMSOrderState.NEW,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Safely updates order record state using state machine rules
   */
  public transitionState(
    record: OMSOrderRecord,
    newState: OMSOrderState,
    reasons?: string[]
  ): boolean {
    if (!OrderStateMachine.canTransition(record.state, newState)) {
      return false;
    }

    record.state = newState;
    record.updatedAt = new Date().toISOString();
    if (reasons && reasons.length > 0) {
      record.rejectionReasons = record.rejectionReasons
        ? [...record.rejectionReasons, ...reasons]
        : [...reasons];
    }
    return true;
  }
}
