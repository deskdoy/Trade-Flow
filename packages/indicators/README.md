# @tradeflow/indicators

This package contains the reusable, event-driven, high-performance **Indicator Engine** for the TradeFlow platform. It provides modular computations for technical analysis indicators (such as SMA and EMA), keeps a high-speed cached lookup layer, and acts as a central coordinator for managing technical overlay studies on financial charting surfaces.

---

## 🏗️ Architecture & High-Performance Dataflow

The architecture of the TradeFlow technical analysis ecosystem decouples the core mathematical calculations from both the data ingestion stream and the visualization canvas. 

```
+---------------------------------------------+
|             Market Data Engine              | (In-memory/event-driven candlestick tick hub)
+----------------------|----------------------+
                       |
                       | Propagates live events & historical backfills
                       v
+---------------------------------------------+
|               React Dashboard               | (apps/web coordinate layer)
+----------------------|----------------------+
                       |
                       | Coordinates and passes data
                       v
+---------------------------------------------+
|              Indicator Engine               | (Calculates models & caches results)
+----------------------|----------------------+
                       |
                       | Serialized IndicatorPoint series
                       v
+---------------------------------------------+
|                Chart Engine                 | (Renders multiple line overlays via Canvas)
+---------------------------------------------+
```

### 1. Unified Contract (`Indicator`)
All custom indicator definitions must implement this core interface:

```typescript
export interface Indicator {
  readonly id: string;           // E.g., 'sma_20'
  readonly name: string;         // E.g., 'Simple Moving Average'
  readonly shortName: string;    // E.g., 'SMA (20)'
  readonly type: string;         // E.g., 'SMA'
  readonly parameters: Record<string, any>;
  calculate(candles: Candle[]): IndicatorPoint[];
}
```

### 2. Built-in Core Indicators
- **SMA (Simple Moving Average)**: Arithmetical moving average computed by summing the close prices of the past $P$ intervals and dividing by $P$.
- **EMA (Exponential Moving Average)**: Cumulative moving average using a dynamic smoothing factor $\alpha = \frac{2}{P + 1}$ to give higher weight to recent tick data.

### 3. Registry & Engine Controller
- **`IndicatorRegistry`**: Static factory registration pattern. Developers register custom indicators and construct configurable instances dynamically via a type key.
- **`IndicatorEngine`**: The orchestration and cache controller.
  - Registers active indicators dynamically.
  - Computes indicator arrays using historical or real-time candle ticks.
  - Stores cached indicators nested by `symbol:timeframe` to prevent redundant math cycles.
  - Emits structured event callbacks (`calculated`, `registered`, `removed`) for reactive state bindings.

---

## ⚡ Integration Specifications

### 1. Market Data Engine Integration
The dashboard UI subscribes to the `MarketDataEngine`'s event bus. When a `historyLoaded` or `newCandle` event triggers, the web client fetches the latest array of candle bars and streams it directly to the `IndicatorEngine`.

### 2. Chart Engine Integration
The computed `IndicatorPoint` series are sent down to the `Chart` component. The `ChartEngine` manages multiple line series and synchronizes them via `syncIndicators`. It updates lines smoothly as new real-time ticks flow in.

```typescript
import { IndicatorEngine, SMAIndicator } from "@tradeflow/indicators";
import { ChartEngine } from "@tradeflow/chart-engine";

// 1. Instantiation
const indicatorEngine = new IndicatorEngine();
indicatorEngine.registerIndicator(new SMAIndicator("sma_20", { period: 20 }));

// 2. Compute Points
const results = indicatorEngine.calculateAll(candles, "BTC/USD", "1D");
const points = results.get("sma_20") || [];

// 3. Render
chartEngine.syncIndicators([{
  id: "sma_20",
  color: "#3b82f6",
  points
}]);
```
