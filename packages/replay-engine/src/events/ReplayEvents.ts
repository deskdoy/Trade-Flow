import { Candle } from '@tradeflow/shared';
import { ReplaySpeed } from '../types/index.ts';

export interface ReplayEventPayloadMap {
  'replay.started': {
    timestamp: string;
    totalCandles: number;
    speed: ReplaySpeed | number;
  };
  'replay.playing': { timestamp: string; currentIndex: number };
  'replay.paused': { timestamp: string; currentIndex: number };
  'replay.resumed': { timestamp: string; currentIndex: number };
  'replay.step': { candle: Candle; index: number; total: number };
  'replay.seek': { previousIndex: number; newIndex: number; candle?: Candle };
  'replay.rewind': { targetIndex: number };
  'replay.fastforward': { targetIndex: number };
  'replay.finished': { totalCandles: number; durationMs: number };
  'replay.completed': { totalCandles: number };
  'replay.failed': { error: string };
}

export type ReplayEventType = keyof ReplayEventPayloadMap;
export type ReplayEventListener<K extends ReplayEventType> = (
  data: ReplayEventPayloadMap[K]
) => void;

export class ReplayEventEmitter {
  private listeners: Map<ReplayEventType, Set<Function>> = new Map();
  private _eventsPublishedCount: number = 0;

  public on<K extends ReplayEventType>(
    event: K,
    listener: ReplayEventListener<K>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  public off<K extends ReplayEventType>(
    event: K,
    listener: ReplayEventListener<K>
  ): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
    }
  }

  public emit<K extends ReplayEventType>(
    event: K,
    data: ReplayEventPayloadMap[K]
  ): void {
    this._eventsPublishedCount++;
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        try {
          listener(data);
        } catch (err) {
          console.error(`Error in ReplayEventListener for ${event}:`, err);
        }
      }
    }
  }

  public get eventsPublished(): number {
    return this._eventsPublishedCount;
  }

  public clear(): void {
    this.listeners.clear();
  }
}
