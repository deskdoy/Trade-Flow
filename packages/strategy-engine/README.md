# @tradeflow/strategy-engine

The Strategy Engine package for TradeFlow. It serves as the single decision-making observation layer that evaluates strategy rules against market data and portfolio context to produce Trading Intents.

## Architecture & Responsibilities

The Strategy Engine observes market state and portfolio updates, evaluates strategy logic, and generates standardized `TradingIntent` recommendations.

It is strictly framework-independent, purely analytical, and never executes trades directly, talks to brokers, or manages orders.

### Key Features
- **Strategy Registry**: Registers, manages, and looks up strategy definitions in $O(1)$ time.
- **Context Management**: Provides strategies with immutable market and portfolio context (`StrategyContext`).
- **Signal Generator**: Built-in helper functions (`crossAbove`, `crossBelow`) for technical rules.
- **Built-in Strategies**:
  - `MovingAverageCrossStrategy`: Fast and slow SMA crossover logic.
  - `BuyAndHoldStrategy`: Initial bar position entry and long-term holding.
- **Validation Engine**: Validates strategy registration metadata, supported symbols/timeframes, and evaluation state.
- **Event Bus**: Strongly-typed events for strategy registration, evaluation, and trading intent generation.

## Component Structure

- `core/StrategyEngine`: Primary coordinator and public API wrapper.
- `registry/StrategyRegistry`: Map-backed $O(1)$ registry for strategy instances.
- `strategies/Strategy`: Strategy interfaces and metadata specifications.
- `strategies/BaseStrategy`: Abstract base class providing intent creation helpers and state management.
- `strategies/MovingAverageCrossStrategy`: Crossover strategy reference implementation.
- `strategies/BuyAndHoldStrategy`: Buy and hold reference implementation.
- `signals/SignalGenerator`: Technical signal calculations.
- `context/StrategyContext`: Immutable evaluation context payload structure.
- `intent/TradingIntent`: Recommendation model specifying BUY, SELL, CLOSE_POSITION, MOVE_STOP, etc.
- `validation/StrategyValidator`: Validation logic for registration and execution context compatibility.
- `events/StrategyEvents`: Event definitions and emitter for strategy lifecycle events.

## Public API Usage Example

```typescript
import { StrategyEngine, MovingAverageCrossStrategy } from '@tradeflow/strategy-engine';

const engine = new StrategyEngine();

// Register strategy
engine.registerStrategy(new MovingAverageCrossStrategy({ fastPeriod: 9, slowPeriod: 21 }));

// Enable strategy
engine.enable('ma-cross');

// Listen to generated trading intents
engine.on('strategy.intent.generated', ({ intent }) => {
  console.log('New Trading Intent:', intent.action, intent.symbol);
});

// Evaluate context
const intents = engine.evaluate({
  symbol: 'BTCUSDT',
  timeframe: '1h',
  candles: [/* candle history */],
  currentTime: new Date().toISOString(),
});
```
