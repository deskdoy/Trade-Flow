# @tradeflow/optimization-engine

A framework-independent, pure TypeScript orchestration engine responsible for multi-parameter strategy optimization over historical candle datasets.

## Overview

The Optimization Engine coordinates repeated runs of `BacktestingEngine` across defined parameter spaces without embedding any trading, indicator, risk, or portfolio logic itself. It supports:
- **Grid Search**: Full Cartesian product generation over numeric ranges and categorical options.
- **Random Search**: Pseudo-random sampled parameter combinations.
- **Result Ranking**: Configurable ranking across metrics (`netProfit`, `maxDrawdown`, `profitFactor`, `winRate`, `sharpeRatio`, etc.) or custom comparator functions.
- **Progress Tracking & Cancellation**: Real-time progress stats (completed/remaining runs, elapsed/estimated remaining time) with cancellation and pause/resume capabilities.
- **Isolated Execution**: Each run is executed in a completely isolated `BacktestingEngine` instance with fresh portfolio, OMS, paper trading, and risk state.

## Architecture & DAG

```
@tradeflow/core
  ↓
@tradeflow/shared
  ↓
@tradeflow/strategy-engine
  ↓
@tradeflow/backtesting-engine
  ↓
@tradeflow/optimization-engine
```

## Key Components

- **OptimizationEngine**: Main orchestrator implementing `EngineLifecycle`, `EngineHealth`, and `SnapshotProvider`.
- **ParameterGenerator**: Generates grid search and random search parameter sets.
- **OptimizationRunner**: Executes isolated `BacktestingEngine` runs per parameter combination.
- **ResultRanking**: Ranks results and assigns rank numbers based on metrics or custom comparators.
- **OptimizationReport**: Pure immutable data report of optimization outcomes.
- **ProgressTracker**: Tracks percentage completion, elapsed time, and ETA.
- **CancellationToken**: Controls cooperative execution pause, resume, and cancellation.

## Usage Example

```typescript
import { OptimizationEngine } from '@tradeflow/optimization-engine';

const engine = new OptimizationEngine({
  config: {
    mode: 'GRID_SEARCH',
    symbol: 'BTC/USD',
    timeframe: '1h',
    rankingMetric: 'netProfit',
  },
  parameterRanges: [
    { name: 'fastEma', type: 'NUMBER', min: 5, max: 20, step: 5 },
    { name: 'slowEma', type: 'NUMBER', min: 20, max: 50, step: 10 },
  ],
});

engine.loadDataset(candles);

const report = engine.run((params) => {
  return createEmaCrossStrategy(params.fastEma, params.slowEma);
});

console.log('Best Parameters:', report.getBestResult()?.parameters);
console.log('Best Net Profit:', report.getBestResult()?.metrics.netProfit);
```
