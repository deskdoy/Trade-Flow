# @tradeflow/trading-domain

The **Trading Domain Foundation** package defines TradeFlow's core domain models, enums, validators, state machines, lifecycle managers, and events.

It represents a pure domain layer without execution logic, market connectivity, broker bindings, or paper trading engine code.

---

## Architecture & Directory Layout

```
packages/trading-domain/
├── src/
│   ├── models/           # Order, Position, Trade, Account, Balance, Symbol
│   ├── enums/            # OrderSide, OrderType, OrderStatus, PositionSide, TimeInForce, MarginMode
│   ├── validation/       # OrderValidator, PositionValidator, SymbolValidator
│   ├── lifecycle/        # OrderStateMachine, PositionLifecycle
│   ├── events/           # TradingEventEmitter, TradingEvents
│   ├── types/            # Interfaces & Domain Types
│   ├── __tests__/        # Complete Unit Test Suite
│   └── index.ts          # Consolidated Public API Exports
├── README.md             # Package Documentation
├── package.json          # Package Specification
└── tsconfig.json         # TypeScript Configuration
```

---

## Domain Models & Enums

### Key Enums
- **`OrderSide`**: `BUY`, `SELL`
- **`OrderType`**: `LIMIT`, `MARKET`, `STOP_LOSS`, `TAKE_PROFIT`, `STOP_LIMIT`
- **`OrderStatus`**: `NEW`, `PENDING`, `PARTIALLY_FILLED`, `FILLED`, `CANCELLED`, `REJECTED`, `EXPIRED`, `CLOSED`
- **`PositionSide`**: `LONG`, `SHORT`, `BOTH`
- **`TimeInForce`**: `GTC`, `IOC`, `FOK`, `DAY`
- **`MarginMode`**: `ISOLATED`, `CROSS`

---

## Order State Machine & Transition Rules

The `OrderStateMachine` enforces valid order status progression and rejects illegal state transitions:

- `NEW` → `PENDING` | `FILLED` | `CANCELLED` | `REJECTED`
- `PENDING` → `PARTIALLY_FILLED` | `FILLED` | `CANCELLED` | `REJECTED` | `EXPIRED`
- `PARTIALLY_FILLED` → `PARTIALLY_FILLED` | `FILLED` | `CANCELLED` | `EXPIRED`
- `FILLED`, `CANCELLED`, `REJECTED`, `EXPIRED` → `CLOSED`
- `CLOSED` → Terminal State (no further transitions permitted)

---

## Public API Usage Examples

```typescript
import {
  OrderSide,
  OrderStatus,
  OrderStateMachine,
  OrderType,
  OrderValidator,
  PositionLifecycle,
  PositionSide,
  SymbolModel,
  TimeInForce,
  TradingEventEmitter,
} from '@tradeflow/trading-domain';

// 1. Symbol Configuration & Order Validation
const symbolConfig = new SymbolModel({
  id: 'BTCUSDT',
  baseAsset: 'BTC',
  quoteAsset: 'USDT',
  pricePrecision: 2,
  quantityPrecision: 4,
  minQuantity: 0.001,
  maxQuantity: 50,
  stepSize: 0.001,
  minNotional: 10,
  status: 'TRADING',
});

const validator = new OrderValidator();
const validation = validator.validate(
  {
    symbol: 'BTCUSDT',
    side: OrderSide.BUY,
    type: OrderType.LIMIT,
    quantity: 0.5,
    price: 95000,
    timeInForce: TimeInForce.GTC,
  },
  symbolConfig
);

console.log('Order valid:', validation.valid);

// 2. Order State Machine Transition
const stateMachine = new OrderStateMachine();
let order = {
  id: 'ord_101',
  symbol: 'BTCUSDT',
  side: OrderSide.BUY,
  type: OrderType.LIMIT,
  status: OrderStatus.NEW,
  quantity: 0.5,
  filledQuantity: 0,
  timeInForce: TimeInForce.GTC,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

order = stateMachine.transition(order, OrderStatus.PENDING);
order = stateMachine.transition(order, OrderStatus.FILLED);
order = stateMachine.transition(order, OrderStatus.CLOSED);

// 3. Position Lifecycle Management
const lifecycle = new PositionLifecycle();

let position = lifecycle.openPosition({
  id: 'pos_001',
  symbol: 'BTCUSDT',
  side: PositionSide.LONG,
  quantity: 1.0,
  entryPrice: 90000,
  leverage: 10,
});

// Update mark price to calculate unrealized PnL
position = lifecycle.updateMarkPrice(position, 94000);
console.log('Unrealized PnL:', position.unrealizedPnl); // +4000

// Close position
const { closedPosition, realizedPnl } = lifecycle.closePosition(position, 95000);
console.log('Realized PnL:', realizedPnl); // +5000

// 4. Strongly Typed Events
const events = new TradingEventEmitter();

events.on('order.created', ({ order }) => {
  console.log('Order created:', order.id);
});

events.on('position.closed', ({ position, realizedPnl }) => {
  console.log(`Position ${position.id} closed with PnL: ${realizedPnl}`);
});
```

---

## Unit Testing

Run unit tests via `tsx`:

```bash
npx tsx packages/trading-domain/src/__tests__/TradingDomain.test.ts
```
