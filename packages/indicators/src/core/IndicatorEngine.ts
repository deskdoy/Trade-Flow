import { Candle } from "@tradeflow/shared";
import { 
  Indicator, 
  IndicatorPoint, 
  IndicatorEngineEventMap, 
  IndicatorEngineEventKey, 
  IndicatorEngineEventListener 
} from "../types/index.ts";

export class IndicatorEngine {
  // Map of active indicators to calculate: id -> Indicator
  private indicators: Map<string, Indicator> = new Map();

  // Results Cache nested as: "symbol:timeframe" -> { [indicatorId]: IndicatorPoint[] }
  private cache: Map<string, Record<string, IndicatorPoint[]>> = new Map();

  // Type-safe event listeners
  private listeners: {
    [K in IndicatorEngineEventKey]?: Set<IndicatorEngineEventListener<K>>;
  } = {};

  constructor(initialIndicators: Indicator[] = []) {
    for (const ind of initialIndicators) {
      this.registerIndicator(ind);
    }
  }

  /**
   * Registers an active indicator instance
   */
  public registerIndicator(indicator: Indicator): void {
    if (this.indicators.has(indicator.id)) {
      console.warn(`[IndicatorEngine] Indicator with ID "${indicator.id}" is already registered.`);
      return;
    }

    this.indicators.set(indicator.id, indicator);
    this.emit("registered", { id: indicator.id, indicator });
  }

  /**
   * Removes an active indicator instance and clears its cache entries
   */
  public removeIndicator(id: string): void {
    if (this.indicators.delete(id)) {
      // Clean up cache
      for (const [key, record] of this.cache.entries()) {
        if (record[id]) {
          delete record[id];
        }
      }
      this.emit("removed", { id });
    }
  }

  /**
   * Gets a list of all currently registered active indicators
   */
  public getIndicators(): Indicator[] {
    return Array.from(this.indicators.values());
  }

  /**
   * Calculates a single registered indicator's values, caching and emitting the result
   */
  public calculate(
    id: string,
    candles: Candle[],
    symbol: string,
    timeframe: string
  ): IndicatorPoint[] {
    const indicator = this.indicators.get(id);
    if (!indicator) {
      throw new Error(`[IndicatorEngine] Indicator "${id}" is not registered.`);
    }

    const points = indicator.calculate(candles);

    // Save to Cache
    const cacheKey = `${symbol}:${timeframe}`;
    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, {});
    }
    this.cache.get(cacheKey)![id] = points;

    // Emit calculation completion event
    this.emit("calculated", {
      indicatorId: id,
      points,
      symbol,
      timeframe,
    });

    return points;
  }

  /**
   * Calculates all registered active indicators
   */
  public calculateAll(
    candles: Candle[],
    symbol: string,
    timeframe: string
  ): Map<string, IndicatorPoint[]> {
    const results = new Map<string, IndicatorPoint[]>();

    for (const id of this.indicators.keys()) {
      try {
        const points = this.calculate(id, candles, symbol, timeframe);
        results.set(id, points);
      } catch (err) {
        console.error(`[IndicatorEngine] Failed calculating indicator "${id}":`, err);
      }
    }

    return results;
  }

  /**
   * Retrieves previously calculated results from cache
   */
  public getCache(id: string, symbol: string, timeframe: string): IndicatorPoint[] | null {
    const cacheKey = `${symbol}:${timeframe}`;
    const record = this.cache.get(cacheKey);
    if (record && record[id]) {
      return record[id];
    }
    return null;
  }

  /**
   * Clears all cached indicator computations
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Subscribes to engine events
   */
  public on<K extends IndicatorEngineEventKey>(
    event: K,
    listener: IndicatorEngineEventListener<K>
  ): void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set() as any;
    }
    (this.listeners[event] as any).add(listener);
  }

  /**
   * Unsubscribes from engine events
   */
  public off<K extends IndicatorEngineEventKey>(
    event: K,
    listener: IndicatorEngineEventListener<K>
  ): void {
    const eventSet = this.listeners[event];
    if (eventSet) {
      (eventSet as any).delete(listener);
    }
  }

  /**
   * Helper to dispatch events to subscribers
   */
  private emit<K extends IndicatorEngineEventKey>(
    event: K,
    payload: MarketDataEventMapOfIndicator<K>
  ): void {
    const eventSet = this.listeners[event];
    if (eventSet) {
      for (const listener of eventSet) {
        try {
          (listener as any)(payload);
        } catch (err) {
          console.error(`[IndicatorEngine] Error in listener for event "${event}":`, err);
        }
      }
    }
  }
}

// Internal type helper since TS has unique map structures
type MarketDataEventMapOfIndicator<K extends IndicatorEngineEventKey> = IndicatorEngineEventMap[K];
