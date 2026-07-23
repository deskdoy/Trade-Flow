import { EventBus } from '@tradeflow/core';
import { ValidationError } from '@tradeflow/trading-domain';
import { TradingIntent } from '../intent/TradingIntent.ts';
import { StrategyMetadata } from '../types/index.ts';

export interface StrategyEventPayloadMap {
  'strategy.registered': { strategyId: string; metadata: StrategyMetadata };
  'strategy.enabled': { strategyId: string };
  'strategy.disabled': { strategyId: string };
  'strategy.evaluated': { strategyId: string; intentsCount: number; timestamp: string };
  'strategy.intent.generated': { intent: TradingIntent };
  'strategy.validation.failed': { strategyId: string; errors: ValidationError[] };
}

export type StrategyEventType = keyof StrategyEventPayloadMap;

export type StrategyEventListener<K extends StrategyEventType> = (
  payload: StrategyEventPayloadMap[K]
) => void;

export class StrategyEventEmitter {
  private eventBus: EventBus = new EventBus();

  public on<K extends StrategyEventType>(
    event: K,
    listener: StrategyEventListener<K>
  ): () => void {
    return this.eventBus.on<StrategyEventPayloadMap[K]>(event, listener);
  }

  public off<K extends StrategyEventType>(
    event: K,
    listener: StrategyEventListener<K>
  ): void {
    this.eventBus.off<StrategyEventPayloadMap[K]>(event, listener);
  }

  public emit<K extends StrategyEventType>(
    event: K,
    payload: StrategyEventPayloadMap[K]
  ): void {
    this.eventBus.emit<StrategyEventPayloadMap[K]>(event, payload);
  }

  public clear(): void {
    this.eventBus.clear();
  }
}
