# @tradeflow/market-data

This package contains the high-performance, event-driven **Market Data Engine** for the TradeFlow platform. It provides a standard abstraction layer for streaming live candlestick ticks and loading historical datasets across multiple symbols and timeframes.

---

## 🏗️ Architecture & Clean Separation of Concerns

The architecture separates the visualization layer from data ingestion. Neither the frontend dashboard nor the **Chart Engine** has any knowledge of where financial feeds originate (e.g., whether they are sourced from Binance, MetaTrader, standard CSV files, or an offline simulator). All data flow is unified under a centralized event dispatcher.

```
       +---------------------------------------------+
       |             React Dashboard UI              |
       |                 (apps/web)                  |
       +----------------------|----------------------+
                     Subscribes to Event Bus
                              v
       +---------------------------------------------+
       |             Market Data Engine              |
       |             (MarketDataEngine)              |
       +----------------------|----------------------+
                              | Delegates calls to
                              v
       +---------------------------------------------+
       |           MarketDataProvider (I)            |
       |       [Mock, Binance, MT5, Replay, CSV]     |
       +---------------------------------------------+
```

### 1. Centralized Engine (`MarketDataEngine`)
The orchestration controller of the entire market data tier.
- Registers multiple custom feeds implementing the unified provider contract.
- Safely swaps active feeds in real-time, handling connection tear-down on the old channel, auto-connecting the new channel, and restoring active subscriptions.
- Exposes a type-safe event subscription model (`on` / `off` / `emit`) for consumer binding.

### 2. Unified Contract (`MarketDataProvider`)
All database connectors, exchange wrappers, or filesystems MUST implement this strict TypeScript contract:

```typescript
export interface MarketDataProvider {
  readonly id: string;
  readonly name: string;
  readonly isConnected: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(symbol: string, timeframe: string): void;
  unsubscribe(symbol: string, timeframe: string): void;
  getHistory(symbol: string, timeframe: string): Promise<Candle[]>;

  onNewCandle(callback: (symbol: string, timeframe: string, candle: Candle) => void): void;
  onConnectionChange(callback: (isConnected: boolean) => void): void;
  onError(callback: (message: string, error?: Error) => void): void;
}
```

### 3. Integrated Providers
- **`MockProvider` (Active)**: A fully offline high-fidelity simulator. Generates deterministic histories based on symbol volatility profiles and spawns custom, tick-by-tick real-time candles every second.
- **`BinanceProvider` (Placeholder)**: Future hook for Binance Pro exchange Spot/Futures API integration.
- **`MT5Provider` (Placeholder)**: Future enterprise bridge connector.
- **`ReplayProvider` (Placeholder)**: Historical simulation feed driving strategic model playbacks.
- **`CSVProvider` (Placeholder)**: Static dataset file loader.

---

## ⚡ Type-Safe Event Bus Spec

The engine propagates changes through an event-driven model. Consumers subscribe to these specific events:

| Event Name | Payload Description |
| :--- | :--- |
| **`historyLoaded`** | Triggered immediately when initial historical data loads. |
| **`newCandle`** | Emitted on periodic intervals when a live tick completes or updates. |
| **`providerChanged`** | Broadcast when the core swaps active ingestion channels. |
| **`connectionChanged`** | Dispatched when the active channel toggles online/offline status. |
| **`error`** | Notifies the listener pool of an internal pipeline or connectivity failure. |

---

## ⚙️ Simple Integration Example

```typescript
import { MarketDataEngine, MockProvider, Candle } from "@tradeflow/market-data";

// 1. Initialize Engine and Register Providers
const engine = new MarketDataEngine([new MockProvider()]);

// 2. Subscribe to Event Dispatcher
engine.on("newCandle", (payload) => {
  console.log(`Live Candle received for ${payload.symbol}:`, payload.candle);
});

engine.on("historyLoaded", (payload) => {
  console.log(`History loaded: ${payload.candles.length} candles.`);
});

// 3. Connect & Ingest
await engine.connect();
engine.subscribe("BTC/USD", "1D");
await engine.getHistory("BTC/USD", "1D");
```
