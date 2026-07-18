import { Candle } from "@tradeflow/shared";

export interface IndicatorPoint {
  time: string;
  value: number;
}

export interface Indicator {
  readonly id: string;           // Instance ID, e.g., "sma_20" or custom ID
  readonly name: string;         // Descriptive name, e.g., "Simple Moving Average"
  readonly shortName: string;    // Display title, e.g., "SMA (20)"
  readonly type: string;         // Indicator type key, e.g. "SMA"
  readonly parameters: Record<string, any>;

  calculate(candles: Candle[]): IndicatorPoint[];
}

export interface IndicatorDefinition {
  readonly type: string;
  readonly name: string;
  createInstance(id: string, parameters: Record<string, any>): Indicator;
}

export interface IndicatorEngineEventMap {
  calculated: { indicatorId: string; points: IndicatorPoint[]; symbol: string; timeframe: string };
  registered: { id: string; indicator: Indicator };
  removed: { id: string };
}

export type IndicatorEngineEventKey = keyof IndicatorEngineEventMap;

export type IndicatorEngineEventListener<K extends IndicatorEngineEventKey> = (
  payload: IndicatorEngineEventMap[K]
) => void;
