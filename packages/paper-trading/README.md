# @tradeflow/paper-trading

The **Paper Trading Engine** package simulates broker-independent order execution, position lifecycle management, PnL tracking, and real-time account accounting using TradeFlow's domain models and market data feeds.

It operates entirely in-memory with zero external API dependencies, HTTP requests, WebSockets, or database connections.

---

## Architecture & Directory Structure

```
packages/paper-trading/
├── src/
│   ├── core/
│   │   └── PaperTradingEngine.ts     # Main Paper Trading Orchestrator
│   ├── orders/
│   │   ├── OrderManager.ts           # Order Lifecycle & Storage
│   │   ├── OrderExecutor.ts          # State Transitions & Trade Creation
│   │   └── FillSimulator.ts          # Market, Limit, and Stop Order Fill Rules
│   ├── positions/
│   │   └── PositionManager.ts        # Position Lifecycle & Mark Price Tracking
│   ├── account/
│   │   └── AccountManager.ts         # Balance, Equity, Margin & Free Margin Accounting
│   ├── pnl/
│   │   ├── UnrealizedPnL.ts          # Floating PnL Calculator
│   │   └── RealizedPnL.ts            # Closed/Reduced Position PnL Calculator
│   ├── events/
│   │   └── PaperTradingEvents.ts     # Strongly Typed EventEmitter
│   ├── types/
│   │   └── index.ts                  # Engine & Event Interfaces
│   ├── __tests__/
│   │   └── PaperTrading.test.ts      # Comprehensive Unit Test Suite
│   └── index.ts                      # Consolidated Public Exports
├── README.md                         # Package Documentation
├── package.json                      # Package Specification
└── tsconfig.json                     # TypeScript Configuration
```

---

## Fill Rules

The `FillSimulator` enforces exact execution semantics based on market candles or price ticks:

1. **Market Orders**: Execute immediately at current market close / price tick.
2. **Buy Limit**: Fills when candle `low <= limit price` (Fill Price = Limit Price).
3. **Sell Limit**: Fills when candle `high >= limit price` (Fill Price = Limit Price).
4. **Buy Stop**: Activates/fills when candle `high >= stop price` (Fill Price = Stop Price).
5. **Sell Stop**: Activates/fills when candle `low <= stop price` (Fill Price = Stop Price).

*Note: In accordance with Sprint 9 scope, slippage, partial fills, commissions, swaps, and broker latency are omitted.*

---

## Strongly Typed Events

`PaperTradingEngine` emits strongly typed events via `PaperTradingEventEmitter`:

- **`paper.order.placed`**: Triggered when an order is created.
- **`paper.order.cancelled`**: Triggered when an order is cancelled.
- **`paper.order.filled`**: Triggered when an order executes a fill.
- **`paper.position.opened`**: Triggered when a new position is established.
- **`paper.position.updated`**: Triggered when an open position quantity or mark price updates.
- **`paper.position.closed`**: Triggered when a position is fully liquidated/closed.
- **`paper.balance.updated`**: Triggered on realized PnL, deposit, or withdrawal.
- **`paper.equity.updated`**: Triggered whenever mark prices change floating PnL or margin requirements.

---

## Public API Usage Example

```typescript
import {
  OrderSide,
  OrderType,
  PaperTradingEngine,
} from '@tradeflow/paper-trading';

// 1. Initialize Engine
const engine = new PaperTradingEngine({
  initialBalance: 100000,
  currency: 'USDT',
  defaultLeverage: 10,
});

// 2. Subscribe to Events
engine.on('paper.order.filled', ({ order, trade }) => {
  console.log(`Order ${order.id} filled at ${trade.price}`);
});

engine.on('paper.position.closed', ({ position, realizedPnL }) => {
  console.log(`Position closed on ${position.symbol} with PnL: ${realizedPnL}`);
});

// 3. Place Orders
const buyLimitOrder = engine.placeOrder({
  symbol: 'BTCUSDT',
  side: OrderSide.BUY,
  type: OrderType.LIMIT,
  quantity: 0.5,
  price: 90000,
});

// 4. Feed Market Data (Candles or Ticks)
engine.onCandle({
  symbol: 'BTCUSDT',
  time: '1700000000',
  open: 91000,
  high: 91500,
  low: 89500, // Triggers limit order fill at 90000
  close: 90500,
});

// 5. Query Account State & Positions
const accountState = engine.getAccountState();
console.log('Balance:', accountState.balance);
console.log('Equity:', accountState.equity);
console.log('Used Margin:', accountState.usedMargin);
console.log('Free Margin:', accountState.freeMargin);

const activePositions = engine.getOpenPositions();
console.log('Active Positions:', activePositions.length);
```

---

## Unit Testing

Run unit tests via `tsx`:

```bash
npx tsx packages/paper-trading/src/__tests__/PaperTrading.test.ts
```
