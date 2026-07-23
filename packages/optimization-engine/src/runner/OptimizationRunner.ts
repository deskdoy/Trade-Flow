import { Candle } from '@tradeflow/shared';
import { Strategy, StrategyEngine } from '@tradeflow/strategy-engine';
import { BacktestingEngine } from '@tradeflow/backtesting-engine';
import { CancellationToken } from '../cancellation/CancellationToken.ts';
import { OptimizationEventEmitter } from '../events/OptimizationEvents.ts';
import { ProgressTracker } from '../progress/ProgressTracker.ts';
import {
  OptimizationConfig,
  OptimizationResultItem,
  ParameterSet,
} from '../types/index.ts';

export type StrategyFactory = (params: ParameterSet) => Strategy;

export class OptimizationRunner {
  private config: OptimizationConfig;
  private dataset: Candle[];
  private strategyFactory: StrategyFactory;
  private cancellationToken: CancellationToken;
  private emitter: OptimizationEventEmitter;
  private tracker: ProgressTracker;

  constructor(
    config: OptimizationConfig,
    dataset: Candle[],
    strategyFactory: StrategyFactory,
    cancellationToken: CancellationToken,
    emitter: OptimizationEventEmitter,
    tracker: ProgressTracker
  ) {
    this.config = config;
    this.dataset = dataset;
    this.strategyFactory = strategyFactory;
    this.cancellationToken = cancellationToken;
    this.emitter = emitter;
    this.tracker = tracker;
  }

  /**
   * Executes a single parameter set run in an isolated BacktestingEngine instance
   */
  public runSingle(
    runIndex: number,
    totalRuns: number,
    parameters: ParameterSet,
    seed: number
  ): OptimizationResultItem {
    const runStartTime = Date.now();

    // 1. Emit run started
    this.emitter.emit('optimization.run.started', {
      runIndex,
      totalRuns,
      parameters,
    });

    // 2. Instantiate fresh isolated strategy instance
    const strategy = this.strategyFactory(parameters);
    const strategyEngine = new StrategyEngine();
    strategyEngine.registerStrategy(strategy);

    // 3. Instantiate fresh isolated BacktestingEngine with no shared mutable state
    const backtester = new BacktestingEngine({
      config: {
        symbol: this.config.symbol,
        timeframe: this.config.timeframe,
        initialBalance: this.config.initialBalance ?? 100000,
        maxCandleHistory: this.config.maxCandleHistory ?? 1000,
        seed,
      },
      strategyEngine,
    });

    // 4. Load dataset & execute backtest synchronously
    backtester.loadDataset(this.dataset);
    backtester.run();

    // 5. Extract metrics & duration
    const report = backtester.generateReport();
    const metrics = report.getMetrics();
    const executionDurationMs = Date.now() - runStartTime;

    const resultItem: OptimizationResultItem = {
      id: `sim-${runIndex + 1}-${Date.now()}`,
      parameters,
      metrics,
      rank: 0,
      seed,
      executionDurationMs,
      timestamp: new Date().toISOString(),
    };

    // 6. Record progress & emit run completed
    this.tracker.recordCompletedRun();

    this.emitter.emit('optimization.run.completed', {
      runIndex,
      result: resultItem,
    });

    this.emitter.emit(
      'optimization.progress',
      this.tracker.getProgress(parameters)
    );

    return resultItem;
  }
}
