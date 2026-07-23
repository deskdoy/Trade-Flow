# @tradeflow/portfolio-engine

The Portfolio & Account Engine package for TradeFlow. It serves as the single source of truth for real-time portfolio, holdings, equity, performance, and trading statistics across the platform.

## Architecture & Responsibilities

The Portfolio Engine acts as the central accounting and state engine for positions, balances, equity curves, and performance metrics. It maintains absolute state decoupling from React, DOM APIs, chart renderers, or broker networks.

### Key Features
- **Position Book**: Manages active open positions and closed position history.
- **Holdings Manager**: Real-time balance, used/free margin, buying power, total equity, and account exposure calculations.
- **Equity Curve**: Time series history of account equity, balance, peak equity, and max drawdown tracking.
- **Performance Tracker**: Net profit, gross profit/loss, average win/loss, profit factor, expectancy, Sharpe ratio, and Sortino ratio calculations.
- **Statistics Engine**: Win rate, trade counts, winning/losing streaks, largest win/loss metrics.
- **Snapshot System**: Full serializable snapshot export and restoration (`getSnapshot()`, `restoreSnapshot()`).
- **Event Bus**: Strongly-typed lifecycle events for portfolio updates.

## Component Structure

- `core/PortfolioEngine`: Primary coordinator and public entry point.
- `positions/PositionBook`: Manages open and closed position collections and PnL aggregation.
- `holdings/HoldingsManager`: Manages balances, margins, buying power, and cash flows.
- `equity/EquityCurve`: Tracks time-series equity points, daily OHLC equity, and drawdowns.
- `pnl/PerformanceTracker`: Calculates trade performance metrics and risk ratios.
- `statistics/StatisticsEngine`: Calculates trading streaks, win rates, and trade size distribution.
- `snapshots/PortfolioSnapshot`: Serialization and deserialization helpers for portfolio snapshots.
- `events/PortfolioEvents`: Typed event bus emitter for `portfolio.*` events.
- `types/`: Domain interfaces and snapshot DTOs.

## Event System

- `portfolio.updated`
- `portfolio.position.opened`
- `portfolio.position.updated`
- `portfolio.position.closed`
- `portfolio.holdings.updated`
- `portfolio.equity.updated`
- `portfolio.performance.updated`
- `portfolio.statistics.updated`

## Public API Usage Example

```typescript
import { PortfolioEngine } from '@tradeflow/portfolio-engine';
import { PositionSide, MarginMode } from '@tradeflow/trading-domain';

const portfolio = new PortfolioEngine({ initialBalance: 100000 });

// Listen to portfolio updates
portfolio.on('portfolio.updated', ({ snapshot }) => {
  console.log('Total Equity:', snapshot.holdings.totalEquity);
});

// Open a position
portfolio.openPosition({
  id: 'pos_1',
  symbol: 'BTCUSDT',
  side: PositionSide.LONG,
  quantity: 1,
  entryPrice: 95000,
  markPrice: 95000,
  unrealizedPnl: 0,
  realizedPnl: 0,
  marginMode: MarginMode.ISOLATED,
  leverage: 10,
  openedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isOpen: true,
});

// Update mark price
portfolio.updateMarkPrice('BTCUSDT', 98000);

// Close position
portfolio.closePosition('pos_1', 98000);

// Get snapshot
const snapshot = portfolio.getSnapshot();

// Restore from snapshot
portfolio.restoreSnapshot(snapshot);
```
