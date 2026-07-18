export interface MarketDataProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(symbol: string): Promise<void>;
  unsubscribe(symbol: string): Promise<void>;
  history(symbol: string, timeframe: string, limit?: number): Promise<any[]>;
}
