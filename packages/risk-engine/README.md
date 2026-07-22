# @tradeflow/risk-engine

The **Risk & Margin Engine** package provides broker-independent risk management, margin calculations, leverage calculations, liquidation estimation, exposure tracking, position sizing, and order validation for the TradeFlow platform.

It is completely decoupled from external broker APIs, HTTP, WebSockets, DOM, or React, operating strictly in-memory using pure domain models from `@tradeflow/trading-domain` and `@tradeflow/paper-trading`.

---

## Directory Structure

```
packages/risk-engine/
├── src/
│   ├── core/
│   │   └── RiskEngine.ts           # Central Risk Engine Orchestrator
│   ├── margin/
│   │   ├── MarginCalculator.ts     # Initial, Maintenance, Used & Free Margin
│   │   └── MarginValidator.ts      # Free Margin Order Validation
│   ├── leverage/
│   │   └── LeverageCalculator.ts   # Effective & Max Leverage Calculations
│   ├── liquidation/
│   │   └── LiquidationCalculator.ts# Precise Long & Short Liquidation Prices
│   ├── exposure/
│   │   └── ExposureCalculator.ts # Gross & Net Symbol & Total Account Exposures
│   ├── sizing/
│   │   ├── PositionSizer.ts        # Position Size & Feasibility Calculator
│   │   └── RiskPerTrade.ts         # Risk-Based Quantity Calculations
│   ├── validation/
│   │   ├── OrderRiskValidator.ts   # Multi-factor Order Risk Validation
│   │   ├── AccountRiskValidator.ts # Account Solvency & Drawdown Validation
│   │   └── RiskValidator.ts        # Composite Risk Validator
│   ├── events/
│   │   └── RiskEvents.ts           # Strongly Typed Event Emitter
│   ├── types/
│   │   └── index.ts                # Interfaces & Types
│   ├── __tests__/
│   │   └── RiskEngine.test.ts      # Unit Test Suite
│   └── index.ts                    # Public API Exports
├── README.md                       # Package Documentation
├── package.json                    # Package Specification
└── tsconfig.json                   # TypeScript Configuration
```

---

## Key Features & Calculations

1. **Margin Calculator**:
   - Initial Margin: `(Price * Quantity) / Leverage`
   - Maintenance Margin: `(MarkPrice * Quantity) * MaintenanceMarginPct`
   - Account Free Margin & Margin Level %

2. **Leverage Calculator**:
   - Effective Leverage: `Total Gross Exposure / Equity`
   - Leverage Cap Verification against `maxLeverage`

3. **Liquidation Price Calculator**:
   - Long Liquidation Price: `EntryPrice * (1 - 1 / Leverage) / (1 - MaintenanceMarginPct)`
   - Short Liquidation Price: `EntryPrice * (1 + 1 / Leverage) / (1 + MaintenanceMarginPct)`
   - Distance to Liquidation in Absolute & Percentage terms

4. **Exposure Tracking**:
   - Symbol Long, Short, Net (`Long - Short`), and Gross (`Long + Short`) Exposures
   - Total Account Gross & Net Exposures

5. **Position Sizing**:
   - Risk per trade monetary amount = `Account Balance * (Risk % / 100)`
   - Recommended quantity = `Risk Amount / |Entry Price - Stop Loss Price|`
   - Feasibility check against available balance and required initial margin

6. **Structured Risk Validation**:
   - Returns structured `RiskValidationResult` containing `{ approved: boolean, reasons: string[], metrics: ... }` instead of throwing runtime exceptions.

---

## Strongly Typed Events

- **`risk.order.approved`**: Emitted when an order passes all risk validation checks.
- **`risk.order.rejected`**: Emitted when an order fails one or more risk checks with detailed reasons.
- **`risk.margin.updated`**: Emitted on margin calculation updates.
- **`risk.leverage.changed`**: Emitted when leverage parameters change.
- **`risk.liquidation.updated`**: Emitted when liquidation estimation metrics update.
- **`risk.position.sized`**: Emitted when position sizing recommendations are calculated.

---

## Integration with Paper Trading Engine

The `RiskEngine` provides a seamless integration point for pre-trade risk validation:

```typescript
import { PaperTradingEngine, OrderSide, OrderType } from '@tradeflow/paper-trading';
import { RiskEngine } from '@tradeflow/risk-engine';

const paperEngine = new PaperTradingEngine({
  initialBalance: 100000,
  currency: 'USDT',
});

const riskEngine = new RiskEngine({
  maxAccountExposure: 500000,
  maxSymbolExposure: 100000,
  maxLeverage: 10,
});

const orderParams = {
  symbol: 'BTCUSDT',
  side: OrderSide.BUY,
  type: OrderType.LIMIT,
  quantity: 0.5,
  price: 90000,
};

// Validate order risk prior to execution
const validation = riskEngine.validatePaperOrder(paperEngine, orderParams, 10);

if (validation.approved) {
  paperEngine.placeOrder(orderParams);
} else {
  console.warn('Order rejected by Risk Engine:', validation.reasons);
}
```

---

## Updated Dependency Graph

```
                   @tradeflow/shared
                           ▲
                           │
                 @tradeflow/trading-domain
                     ▲           ▲
                     │           │
       @tradeflow/core    @tradeflow/paper-trading
                     ▲           ▲
                     │           │
                 @tradeflow/risk-engine
```

---

## Running Unit Tests

Execute the unit test suite via `tsx`:

```bash
npx tsx packages/risk-engine/src/__tests__/RiskEngine.test.ts
```
