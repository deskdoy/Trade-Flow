import { Candle } from "@tradeflow/shared";
import { MarketDataProvider } from "../types/index.ts";

export class BinanceProvider implements MarketDataProvider {
  public readonly id = "binance";
  public readonly name = "Binance Pro";
  private _isConnected = false;

  private newCandleCallback?: (symbol: string, timeframe: string, candle: Candle) => void;
  private connectionChangeCallback?: (isConnected: boolean) => void;
  private errorCallback?: (message: string, error?: Error) => void;

  public get isConnected(): boolean {
    return this._isConnected;
  }

  public async connect(): Promise<void> {
    console.log("[BinanceProvider] Connection initiated (placeholder)");
    this._isConnected = true;
    if (this.connectionChangeCallback) {
      this.connectionChangeCallback(true);
    }
  }

  public async disconnect(): Promise<void> {
    console.log("[BinanceProvider] Disconnection initiated");
    this._isConnected = false;
    if (this.connectionChangeCallback) {
      this.connectionChangeCallback(false);
    }
  }

  public subscribe(symbol: string, timeframe: string): void {
    console.log(`[BinanceProvider] Subscribed to ${symbol} - ${timeframe}`);
  }

  public unsubscribe(symbol: string, timeframe: string): void {
    console.log(`[BinanceProvider] Unsubscribed from ${symbol} - ${timeframe}`);
  }

  public async getHistory(symbol: string, timeframe: string): Promise<Candle[]> {
    console.log(`[BinanceProvider] Fetching history for ${symbol} - ${timeframe} (empty placeholder)`);
    return [];
  }

  public onNewCandle(callback: (symbol: string, timeframe: string, candle: Candle) => void): void {
    this.newCandleCallback = callback;
  }

  public onConnectionChange(callback: (isConnected: boolean) => void): void {
    this.connectionChangeCallback = callback;
  }

  public onError(callback: (message: string, error?: Error) => void): void {
    this.errorCallback = callback;
  }
}
