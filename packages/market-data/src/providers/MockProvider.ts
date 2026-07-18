import { Candle } from "@tradeflow/shared";
import { MarketDataProvider } from "../types/index.ts";

export class MockProvider implements MarketDataProvider {
  public readonly id = "mock";
  public readonly name = "Simulator Engine";
  private _isConnected = false;

  // In-memory cache of histories: "symbol:timeframe" -> Candle[]
  private histories: Map<string, Candle[]> = new Map();
  
  // Active subscriptions: "symbol:timeframe" -> NodeJS.Timeout
  private activeSubscriptions: Map<string, any> = new Map();

  private newCandleCallback?: (symbol: string, timeframe: string, candle: Candle) => void;
  private connectionChangeCallback?: (isConnected: boolean) => void;
  private errorCallback?: (message: string, error?: Error) => void;

  public get isConnected(): boolean {
    return this._isConnected;
  }

  public async connect(): Promise<void> {
    this._isConnected = true;
    if (this.connectionChangeCallback) {
      this.connectionChangeCallback(true);
    }
  }

  public async disconnect(): Promise<void> {
    // Clear all simulation intervals
    for (const [key, timer] of this.activeSubscriptions.entries()) {
      clearInterval(timer);
      console.log(`[MockProvider] Cleared live interval for ${key}`);
    }
    this.activeSubscriptions.clear();
    
    this._isConnected = false;
    if (this.connectionChangeCallback) {
      this.connectionChangeCallback(false);
    }
  }

  public subscribe(symbol: string, timeframe: string): void {
    if (!this._isConnected) {
      console.warn(`[MockProvider] Cannot subscribe to ${symbol} ${timeframe} while disconnected`);
      return;
    }

    const key = `${symbol}:${timeframe}`;
    if (this.activeSubscriptions.has(key)) {
      return;
    }

    console.log(`[MockProvider] Subscribing to live ticks for ${key}`);

    // Create interval that runs every second to simulate a new candle
    const interval = setInterval(() => {
      this.tickNewCandle(symbol, timeframe);
    }, 1000);

    this.activeSubscriptions.set(key, interval);
  }

  public unsubscribe(symbol: string, timeframe: string): void {
    const key = `${symbol}:${timeframe}`;
    const interval = this.activeSubscriptions.get(key);
    if (interval) {
      clearInterval(interval);
      this.activeSubscriptions.delete(key);
      console.log(`[MockProvider] Unsubscribed from ${key}`);
    }
  }

  public async getHistory(symbol: string, timeframe: string): Promise<Candle[]> {
    const key = `${symbol}:${timeframe}`;
    
    // Check if we already have a generated history, if so return it
    let history = this.histories.get(key);
    if (history) {
      return [...history];
    }

    // Generate brand new initial historical data
    const basePrices: Record<string, number> = {
      "BTC/USD": 62000,
      "ETH/USD": 3200,
      "SOL/USD": 140,
    };

    const basePrice = basePrices[symbol] || 100;
    const count = 100;
    
    // Volatilities and trends
    const volatility = symbol === "SOL/USD" ? 0.025 : symbol === "ETH/USD" ? 0.02 : 0.015;
    const trend = 0.02; // general slightly upward trend

    history = this.generateHistory(basePrice, count, volatility, trend, timeframe);
    this.histories.set(key, history);

    return [...history];
  }

  /**
   * Generates a completed sequential candle array
   */
  private generateHistory(
    basePrice: number,
    count: number,
    volatility: number,
    trend: number,
    timeframe: string
  ): Candle[] {
    const candles: Candle[] = [];
    const now = new Date();
    let currentPrice = basePrice;

    // Time difference per step
    const stepMs = this.getStepMs(timeframe);

    for (let i = count; i >= 1; i--) {
      const candleTime = new Date(now.getTime() - i * stepMs);
      const timeStr = this.formatTime(candleTime, timeframe);

      const change = (Math.random() - 0.5 + trend) * volatility * currentPrice;
      const open = parseFloat(currentPrice.toFixed(2));
      const close = parseFloat((currentPrice + change).toFixed(2));

      const maxOC = Math.max(open, close);
      const minOC = Math.min(open, close);
      const high = parseFloat((maxOC + Math.random() * volatility * 0.4 * currentPrice).toFixed(2));
      const low = parseFloat((minOC - Math.random() * volatility * 0.4 * currentPrice).toFixed(2));
      const volume = Math.floor(1000 + Math.random() * 5000);

      candles.push({
        time: timeStr,
        open,
        high,
        low,
        close,
        volume,
      });

      currentPrice = close;
    }

    return candles;
  }

  /**
   * Appends and dispatches a new candle to active subscriptions
   */
  private tickNewCandle(symbol: string, timeframe: string): void {
    const key = `${symbol}:${timeframe}`;
    const history = this.histories.get(key);
    if (!history || history.length === 0) {
      return;
    }

    const lastCandle = history[history.length - 1];
    
    // Parse last candle time and advance by 1 step
    let lastTime: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(lastCandle.time)) {
      lastTime = new Date(lastCandle.time + "T00:00:00Z");
    } else {
      lastTime = new Date(lastCandle.time);
    }

    const stepMs = this.getStepMs(timeframe);
    const newTime = new Date(lastTime.getTime() + stepMs);
    const timeStr = this.formatTime(newTime, timeframe);

    // Compute prices based on last close
    const volatility = symbol === "SOL/USD" ? 0.025 : symbol === "ETH/USD" ? 0.02 : 0.015;
    const change = (Math.random() - 0.48) * volatility * lastCandle.close; // Slight bias
    const open = lastCandle.close;
    const close = parseFloat((open + change).toFixed(2));

    const maxOC = Math.max(open, close);
    const minOC = Math.min(open, close);
    const high = parseFloat((maxOC + Math.random() * volatility * 0.4 * open).toFixed(2));
    const low = parseFloat((minOC - Math.random() * volatility * 0.4 * open).toFixed(2));
    const volume = Math.floor(1000 + Math.random() * 5000);

    const newCandle: Candle = {
      time: timeStr,
      open,
      high,
      low,
      close,
      volume,
    };

    // Store in cache
    history.push(newCandle);
    if (history.length > 500) {
      history.shift(); // Keep cache size bound
    }

    // Trigger Callback
    if (this.newCandleCallback) {
      this.newCandleCallback(symbol, timeframe, newCandle);
    }
  }

  private getStepMs(timeframe: string): number {
    switch (timeframe) {
      case "1H":
        return 60 * 60 * 1000;
      case "4H":
        return 4 * 60 * 60 * 1000;
      case "1D":
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  private formatTime(date: Date, timeframe: string): string {
    if (timeframe === "1D") {
      return date.toISOString().split("T")[0]; // YYYY-MM-DD
    } else {
      return date.toISOString(); // Full timestamp for sub-daily precision
    }
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
