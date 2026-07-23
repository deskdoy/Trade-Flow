# @tradeflow/backtesting-engine

A framework-independent, pure TypeScript orchestration engine responsible for historical trading strategy backtesting.

## Overview

The Backtesting Engine coordinates TradeFlow's modular DAG engine pipeline over historical candle datasets:
1. Feeds historical candles through `PaperTradingEngine` to evaluate pending orders & trigger fills.
2. Updates `PortfolioEngine` mark prices & equity state.
3. Prepares `StrategyContext` with historical candle window.
4. Evaluates `StrategyEngine` to produce `TradingIntent` decisions.
5. Forwards decisions to `OrderManagementEngine` (OMS).
6. Let OMS invoke `RiskEngine` validation.
7. Let OMS route to `ExecutionEngine` & `PaperTradingEngine`.
8. Mirror fills into `PortfolioEngine`.
9. Generate immutable `BacktestReport` using Portfolio Engine metrics.

## Key Components

- **BacktestingEngine**: Main orchestrator implementing `EngineLifecycle`, `EngineHealth`, and `SnapshotProvider`.
- **SimulationClock**: Deterministic simulation clock (`start`, `pause`, `resume`, `stop`, `seek`, `next`, `previous`, `currentTime`). Never uses real `Date.now()` for simulation time.
- **PlaybackController**: Controls playback state and speeds (`1x`, `2x`, `4x`, `10x`, `UNLIMITED`).
- **HistoricalDataset**: In-memory candle dataset supporting fast range slices without copying.
- **BacktestReport**: Immutable report object containing Sharpe ratio, Sortino ratio, max drawdown, win rate, expectancy, and profit factor.
- **BacktestEvents**: Strongly typed event bus publishing `backtest.started`, `backtest.paused`, `backtest.step`, `backtest.completed`, etc.

## Usage Example

```typescript
import { BacktestingEngine } from '@tradeflow/backtesting-engine';
import { StrategyEngine, Strategy } from '@tradeflow/strategy-engine';

const strategyEngine = new StrategyEngine();
strategyEngine.registerStrategy(myStrategy);

const backtester = new BacktestingEngine({
  config: {
    symbol: 'BTC/USD',
    timeframe: '1h',
    initialBalance: 100000,
  },
  strategyEngine,
});

backtester.loadDataset(candles);
backtester.run();

const report = backtester.generateReport();
console.log('Win Rate:', report.getMetrics().winRate);
console.log('Net Profit:', report.getMetrics().netProfit);
```
