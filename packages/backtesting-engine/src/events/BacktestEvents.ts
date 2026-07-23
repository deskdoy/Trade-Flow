import { EventBus } from '@tradeflow/core';
import { Candle } from '@tradeflow/shared';
import { BacktestReportMetrics, BacktestState, PlaybackSpeed } from '../types/index.ts';

export interface BacktestEventPayloadMap {
  'backtest.started': { symbol: string; timeframe: string; totalCandles: number };
  'backtest.paused': { index: number; timestamp: string };
  'backtest.resumed': { index: number; timestamp: string };
  'backtest.step': { index: number; candle: Candle; totalCandles: number };
  'backtest.completed': { report: BacktestReportMetrics };
  'backtest.finished': { state: BacktestState; index: number };
  'backtest.failed': { error: string };
  'backtest.speed.changed': { speed: PlaybackSpeed };
  'backtest.error': { error: string };
}

export type BacktestEventType = keyof BacktestEventPayloadMap;

export type BacktestEventListener<K extends BacktestEventType> = (
  payload: BacktestEventPayloadMap[K]
) => void;

export class BacktestEventEmitter {
  private eventBus: EventBus = new EventBus();

  public on<K extends BacktestEventType>(
    event: K,
    listener: BacktestEventListener<K>
  ): () => void {
    return this.eventBus.on<BacktestEventPayloadMap[K]>(event, listener);
  }

  public off<K extends BacktestEventType>(
    event: K,
    listener: BacktestEventListener<K>
  ): void {
    this.eventBus.off<BacktestEventPayloadMap[K]>(event, listener);
  }

  public emit<K extends BacktestEventType>(
    event: K,
    payload: BacktestEventPayloadMap[K]
  ): void {
    this.eventBus.emit<BacktestEventPayloadMap[K]>(event, payload);
  }

  public clear(): void {
    this.eventBus.clear();
  }
}
