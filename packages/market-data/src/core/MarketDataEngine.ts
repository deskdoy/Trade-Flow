import { Candle } from "@tradeflow/shared";
import { 
  MarketDataProvider, 
  MarketDataEventMap, 
  MarketDataEventKey, 
  MarketDataEventListener 
} from "../types/index.ts";

export class MarketDataEngine {
  private providers: Map<string, MarketDataProvider> = new Map();
  private activeProvider: MarketDataProvider | null = null;
  private isEngineConnected = false;

  // Active subscriptions tracked as "symbol:timeframe"
  private activeSubscriptions: Set<string> = new Set();

  // Type-safe event listeners
  private listeners: {
    [K in MarketDataEventKey]?: Set<MarketDataEventListener<K>>;
  } = {};

  constructor(initialProviders: MarketDataProvider[] = []) {
    for (const provider of initialProviders) {
      this.registerProvider(provider);
    }
  }

  /**
   * Registers a market data provider in the engine
   */
  public registerProvider(provider: MarketDataProvider): void {
    if (this.providers.has(provider.id)) {
      console.warn(`[MarketDataEngine] Provider with id "${provider.id}" is already registered.`);
      return;
    }

    this.providers.set(provider.id, provider);

    // Set up listeners for the provider's callbacks
    provider.onNewCandle((symbol, timeframe, candle) => {
      // Only dispatch if it's from the active provider
      if (this.activeProvider?.id === provider.id) {
        this.emit("newCandle", { symbol, timeframe, candle });
      }
    });

    provider.onConnectionChange((isConnected) => {
      this.emit("connectionChanged", { providerId: provider.id, isConnected });
    });

    provider.onError((message, error) => {
      this.emit("error", { providerId: provider.id, message, error });
    });

    // If there is no active provider, set this as the default active provider
    if (!this.activeProvider) {
      this.activeProvider = provider;
    }
  }

  /**
   * Switches the active provider. Clears subscriptions on old provider,
   * connects the new provider, and restores active subscriptions.
   */
  public async switchProvider(providerId: string): Promise<void> {
    const newProvider = this.providers.get(providerId);
    if (!newProvider) {
      throw new Error(`[MarketDataEngine] Provider with ID "${providerId}" not found`);
    }

    const oldProvider = this.activeProvider;
    if (oldProvider?.id === providerId) {
      return;
    }

    console.log(`[MarketDataEngine] Switching from "${oldProvider?.name || "none"}" to "${newProvider.name}"`);

    // 1. Unsubscribe from old provider
    if (oldProvider && this.isEngineConnected) {
      for (const sub of this.activeSubscriptions) {
        const [symbol, timeframe] = sub.split(":");
        oldProvider.unsubscribe(symbol, timeframe);
      }
      await oldProvider.disconnect();
    }

    // 2. Set new active provider
    this.activeProvider = newProvider;

    // 3. Trigger provider changed event
    this.emit("providerChanged", {
      providerId: newProvider.id,
      providerName: newProvider.name,
    });

    // 4. Connect and subscribe new provider if the engine itself is in a connected state
    if (this.isEngineConnected) {
      await newProvider.connect();
      for (const sub of this.activeSubscriptions) {
        const [symbol, timeframe] = sub.split(":");
        newProvider.subscribe(symbol, timeframe);
        
        // Auto-fetch history on switch to trigger visual update
        try {
          const candles = await newProvider.getHistory(symbol, timeframe);
          this.emit("historyLoaded", { symbol, timeframe, candles });
        } catch (err: any) {
          this.emit("error", {
            providerId: newProvider.id,
            message: `Failed to reload history during switch for ${symbol}`,
            error: err,
          });
        }
      }
    }
  }

  /**
   * Gets the active provider
   */
  public getActiveProvider(): MarketDataProvider | null {
    return this.activeProvider;
  }

  /**
   * Returns all registered providers
   */
  public getProviders(): MarketDataProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Connects the engine (and the active provider)
   */
  public async connect(): Promise<void> {
    if (this.isEngineConnected) {
      return;
    }

    this.isEngineConnected = true;
    if (this.activeProvider) {
      await this.activeProvider.connect();
    }
  }

  /**
   * Disconnects the engine (and the active provider)
   */
  public async disconnect(): Promise<void> {
    if (!this.isEngineConnected) {
      return;
    }

    this.isEngineConnected = false;
    if (this.activeProvider) {
      await this.activeProvider.disconnect();
    }
  }

  /**
   * Subscribes to tick/candle updates for a symbol + timeframe
   */
  public subscribe(symbol: string, timeframe: string): void {
    const key = `${symbol}:${timeframe}`;
    this.activeSubscriptions.add(key);

    if (this.isEngineConnected && this.activeProvider) {
      this.activeProvider.subscribe(symbol, timeframe);
    }
  }

  /**
   * Unsubscribes from tick/candle updates for a symbol + timeframe
   */
  public unsubscribe(symbol: string, timeframe: string): void {
    const key = `${symbol}:${timeframe}`;
    this.activeSubscriptions.delete(key);

    if (this.activeProvider) {
      this.activeProvider.unsubscribe(symbol, timeframe);
    }
  }

  /**
   * Requests historical candles for a symbol and timeframe
   */
  public async getHistory(symbol: string, timeframe: string): Promise<Candle[]> {
    if (!this.activeProvider) {
      throw new Error("[MarketDataEngine] No active provider selected");
    }

    const candles = await this.activeProvider.getHistory(symbol, timeframe);
    this.emit("historyLoaded", { symbol, timeframe, candles });
    return candles;
  }

  /**
   * Subscribes to engine events
   */
  public on<K extends MarketDataEventKey>(
    event: K,
    listener: MarketDataEventListener<K>
  ): void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set() as any;
    }
    (this.listeners[event] as any).add(listener);
  }

  /**
   * Unsubscribes from engine events
   */
  public off<K extends MarketDataEventKey>(
    event: K,
    listener: MarketDataEventListener<K>
  ): void {
    const eventSet = this.listeners[event];
    if (eventSet) {
      (eventSet as any).delete(listener);
    }
  }

  /**
   * Helper to dispatch events to subscribers
   */
  private emit<K extends MarketDataEventKey>(
    event: K,
    payload: MarketDataEventMap[K]
  ): void {
    const eventSet = this.listeners[event];
    if (eventSet) {
      for (const listener of eventSet) {
        try {
          (listener as any)(payload);
        } catch (err) {
          console.error(`[MarketDataEngine] Error in listener for event "${event}":`, err);
        }
      }
    }
  }
}
