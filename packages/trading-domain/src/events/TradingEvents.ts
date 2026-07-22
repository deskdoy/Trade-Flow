import { EventBus } from '@tradeflow/core';
import { OrderStatus } from '../enums/index.ts';
import { OrderData, PositionData, TradeData } from '../types/index.ts';

export interface TradingEventPayloadMap {
  'order.created': { order: OrderData };
  'order.updated': { order: OrderData; previousStatus?: OrderStatus };
  'order.cancelled': { order: OrderData; reason?: string };
  'order.filled': { order: OrderData; trade: TradeData };
  'position.opened': { position: PositionData };
  'position.updated': { position: PositionData; realizedPnl?: number };
  'position.closed': { position: PositionData; realizedPnl: number; exitPrice: number };
  'trade.executed': { trade: TradeData };
}

export type TradingEventType = keyof TradingEventPayloadMap;

export type TradingEventListener<K extends TradingEventType> = (
  payload: TradingEventPayloadMap[K]
) => void;

export class TradingEventEmitter {
  private eventBus: EventBus = new EventBus();

  public on<K extends TradingEventType>(
    event: K,
    listener: TradingEventListener<K>
  ): () => void {
    return this.eventBus.on<TradingEventPayloadMap[K]>(event, listener);
  }

  public off<K extends TradingEventType>(
    event: K,
    listener: TradingEventListener<K>
  ): void {
    this.eventBus.off<TradingEventPayloadMap[K]>(event, listener);
  }

  public emit<K extends TradingEventType>(
    event: K,
    payload: TradingEventPayloadMap[K]
  ): void {
    this.eventBus.emit<TradingEventPayloadMap[K]>(event, payload);
  }

  public clear(): void {
    this.eventBus.clear();
  }
}
