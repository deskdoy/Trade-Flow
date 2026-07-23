import { EventBus } from '@tradeflow/core';
import { OrderData, PositionData, TradeData } from '@tradeflow/trading-domain';
import { PaperAccountState } from '../types/index.ts';

export interface PaperTradingEventPayloadMap {
  'paper.order.placed': { order: OrderData };
  'paper.order.cancelled': { order: OrderData; reason?: string };
  'paper.order.filled': { order: OrderData; trade: TradeData };
  'paper.trade.executed': { order: OrderData; trade: TradeData };
  'paper.position.opened': { position: PositionData };
  'paper.position.updated': { position: PositionData; realizedPnL?: number };
  'paper.position.closed': { position: PositionData; realizedPnL: number; exitPrice: number };
  'paper.balance.updated': { balance: number; currency: string };
  'paper.equity.updated': { accountState: PaperAccountState };
}

export type PaperTradingEventType = keyof PaperTradingEventPayloadMap;

export type PaperTradingEventListener<K extends PaperTradingEventType> = (
  payload: PaperTradingEventPayloadMap[K]
) => void;

export class PaperTradingEventEmitter {
  private eventBus: EventBus = new EventBus();

  public on<K extends PaperTradingEventType>(
    event: K,
    listener: PaperTradingEventListener<K>
  ): () => void {
    return this.eventBus.on<PaperTradingEventPayloadMap[K]>(event, listener);
  }

  public off<K extends PaperTradingEventType>(
    event: K,
    listener: PaperTradingEventListener<K>
  ): void {
    this.eventBus.off<PaperTradingEventPayloadMap[K]>(event, listener);
  }

  public emit<K extends PaperTradingEventType>(
    event: K,
    payload: PaperTradingEventPayloadMap[K]
  ): void {
    this.eventBus.emit<PaperTradingEventPayloadMap[K]>(event, payload);
  }

  public clear(): void {
    this.eventBus.clear();
  }
}
