import { Candle } from "@tradeflow/shared";

export interface MarketDataEventMap {
  historyLoaded: { symbol: string; timeframe: string; candles: Candle[] };
  newCandle: { symbol: string; timeframe: string; candle: Candle };
  providerChanged: { providerId: string; providerName: string };
  connectionChanged: { providerId: string; isConnected: boolean };
  error: { providerId: string; message: string; error?: Error };
}

export type MarketDataEventKey = keyof MarketDataEventMap;

export type MarketDataEventListener<K extends MarketDataEventKey> = (
  payload: MarketDataEventMap[K]
) => void;

export interface MarketDataProvider {
  readonly id: string;
  readonly name: string;
  readonly isConnected: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(symbol: string, timeframe: string): void;
  unsubscribe(symbol: string, timeframe: string): void;
  getHistory(symbol: string, timeframe: string): Promise<Candle[]>;

  // Providers will notify the engine of events via callbacks
  onNewCandle(callback: (symbol: string, timeframe: string, candle: Candle) => void): void;
  onConnectionChange(callback: (isConnected: boolean) => void): void;
  onError(callback: (message: string, error?: Error) => void): void;
}
