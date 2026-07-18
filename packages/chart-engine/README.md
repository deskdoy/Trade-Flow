# @tradeflow/chart-engine

This package contains the high-performance financial visualization engine for the TradeFlow platform, utilizing **TradingView's Lightweight Charts**. It is engineered to provide fluid, hardware-accelerated candlestick charts, pan and zoom, real-time-capable updates, and a responsive design that automatically handles container resize changes.

---

## 🏗️ Architecture & Core Components

The architecture separates the declarative React component layer from the imperative charting lifecycle library to achieve high-performance rendering.

```
       +---------------------------------------------+
       |             React Web Application           |
       |                 (apps/web)                  |
       +----------------------|----------------------+
                              | Uses
                              v
       +---------------------------------------------+
       |          React Wrapper Component            |
       |        (packages/chart-engine/Chart)        |
       +----------------------|----------------------+
                              | Instantiates & Resizes
                              v
       +---------------------------------------------+
       |             Chart Engine Core               |
       |     (packages/chart-engine/ChartEngine)     |
       +----------------------|----------------------+
                              | Renders via Canvas/SVG
                              v
       +---------------------------------------------+
       |        Lightweight Charts (TradingView)     |
       +---------------------------------------------+
```

### 1. `ChartEngine` Class (`src/ChartEngine.ts`)
A framework-agnostic core class wrapping Lightweight Charts. It isolates canvas drawing, scale formatting, crosshair behaviors, and theme modifications away from React, reducing render cycles.

- **`constructor(container: HTMLElement, theme: "light" | "dark")`**: Instantiates and sets options.
- **`setCandles(candles: Candle[])`**: Validates, maps timestamps, and updates series data.
- **`resize(width: number, height: number)`**: Performs layout recalculation on the underlying canvas.
- **`destroy()`**: Releases resources, event handlers, and references to prevent memory leaks.
- **`addIndicator()`, `removeIndicator()`, `addDrawing()`, `removeDrawing()`**: Placeholder hooks reserved for future sprints.

### 2. `Chart` Component (`src/components/Chart.tsx`)
A reusable React functional component that embeds `ChartEngine` inside container nodes.

- Receives inputs: `candles`, `symbol`, `timeframe`, and `theme`.
- Instantiates `ChartEngine` inside an active `useEffect` upon mounting.
- Subscribes a **`ResizeObserver`** to the wrapper div. When resized, it automatically notifies `ChartEngine.resize()` without window polling.
- Updates data dynamically inside a reactive hook when `candles` data reference changes.
- Disposes of observers and calls `engine.destroy()` upon component unmounting.

---

## 📊 Shared Type Contracts

All candlestick structures are bound to a uniform, strict contract defined within `@tradeflow/shared` types to ensure compiler agreement across frontend, mock data providers, and ingestion workers.

```typescript
export interface Candle {
  time: string; // "YYYY-MM-DD" or ISO date string (supports intra-day Unix stamps)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}
```

---

## 🛠️ Usage Example

Embedding the TradeFlow Chart Component inside any React view:

```typescript
import { Chart } from "@tradeflow/chart-engine";
import { Candle } from "@tradeflow/shared";

const myCandles: Candle[] = [
  { time: "2026-07-01", open: 100, high: 105, low: 98, close: 103 },
  { time: "2026-07-02", open: 103, high: 108, low: 102, close: 107 }
];

export default function MyDashboard() {
  return (
    <div className="h-[400px] w-full">
      <Chart 
        candles={myCandles} 
        symbol="BTC/USD" 
        timeframe="1D" 
        theme="dark" 
      />
    </div>
  );
}
```

---

## 💎 Design and Theme Integration

The chart visual configuration is synchronized with the **TradeFlow Dark Theme System** through direct alignment of options to our CSS palette:
- **Background**: `#111418` (matches `--color-brand-panel` for native containment).
- **Bullish (Up) Candles**: `#0ecb81` (matches `--color-brand-green`).
- **Bearish (Down) Candles**: `#f6465d` (matches `--color-brand-red`).
- **Grids & Border Borders**: `rgba(43, 49, 57, 0.4)` (matches `--color-brand-border`).
- **Typography & Labels**: `#848e9c` (matches `--color-brand-text-muted` using Inter/Fira Code).
