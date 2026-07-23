import { EventBus } from '@tradeflow/core';
import { OrderData } from '@tradeflow/trading-domain';
import { OMSOrderRecord, OrderRequest } from '../types/index.ts';

export interface OrderEventPayloadMap {
  'oms.order.created': { orderRecord: OMSOrderRecord };
  'oms.order.validated': { orderRecord: OMSOrderRecord; approved: boolean; reasons: string[] };
  'oms.order.approved': { orderRecord: OMSOrderRecord };
  'oms.order.rejected': { orderRecord: OMSOrderRecord; reasons: string[] };
  'oms.order.routed': { orderRecord: OMSOrderRecord; targetId: string };
  'oms.order.filled': { orderRecord: OMSOrderRecord; executionResult?: OrderData };
  'oms.order.cancelled': { orderRecord: OMSOrderRecord; reason?: string };
  'oms.order.modified': { orderRecord: OMSOrderRecord; previousRequest: OrderRequest };
  'oms.position.closed': { symbol: string; closedQuantity: number; executionResult?: OrderData };
}

export type OrderEventType = keyof OrderEventPayloadMap;

export type OrderEventListener<K extends OrderEventType> = (
  payload: OrderEventPayloadMap[K]
) => void;

export class OrderEventEmitter {
  private eventBus: EventBus = new EventBus();

  public on<K extends OrderEventType>(
    event: K,
    listener: OrderEventListener<K>
  ): () => void {
    return this.eventBus.on<OrderEventPayloadMap[K]>(event, listener);
  }

  public off<K extends OrderEventType>(
    event: K,
    listener: OrderEventListener<K>
  ): void {
    this.eventBus.off<OrderEventPayloadMap[K]>(event, listener);
  }

  public emit<K extends OrderEventType>(
    event: K,
    payload: OrderEventPayloadMap[K]
  ): void {
    this.eventBus.emit<OrderEventPayloadMap[K]>(event, payload);
  }

  public clear(): void {
    this.eventBus.clear();
  }
}
