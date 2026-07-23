import { EngineHealth, EngineLifecycle, SnapshotProvider } from '@tradeflow/core';
import { Candle } from '@tradeflow/shared';
import { CancellationToken } from '../cancellation/CancellationToken.ts';
import {
  OptimizationEventEmitter,
  OptimizationEventListener,
  OptimizationEventType,
} from '../events/OptimizationEvents.ts';
import { ParameterGenerator } from '../parameters/ParameterGenerator.ts';
import { ParameterSpace } from '../parameters/ParameterSpace.ts';
import { ParameterValidator } from '../parameters/ParameterValidator.ts';
import { ProgressTracker } from '../progress/ProgressTracker.ts';
import { CustomComparator, ResultRanking } from '../ranking/ResultRanking.ts';
import { OptimizationReport } from '../reports/OptimizationReport.ts';
import { OptimizationRunner, StrategyFactory } from '../runner/OptimizationRunner.ts';
import { OptimizationSnapshot } from '../snapshots/OptimizationSnapshot.ts';
import {
  OptimizationConfig,
  OptimizationProgressData,
  OptimizationResultItem,
  OptimizationSnapshotData,
  OptimizationState,
  ParameterRange,
  ParameterSet,
} from '../types/index.ts';

export interface OptimizationEngineOptions {
  config?: Partial<OptimizationConfig>;
  parameterRanges?: ParameterRange[];
}

export class OptimizationEngine
  implements SnapshotProvider<OptimizationSnapshotData>, EngineLifecycle {
  private config: OptimizationConfig;
  private parameterSpace: ParameterSpace;
  private cancellationToken: CancellationToken = new CancellationToken();
  private emitter: OptimizationEventEmitter = new OptimizationEventEmitter();
  private tracker: ProgressTracker = new ProgressTracker();

  private state: OptimizationState = 'IDLE';
  private dataset: Candle[] = [];
  private results: OptimizationResultItem[] = [];
  private startTime: number = Date.now();
  private runDurationMs: number = 0;
  private createdAt: string = new Date().toISOString();

  constructor(options: OptimizationEngineOptions = {}) {
    this.config = {
      mode: options.config?.mode ?? 'GRID_SEARCH',
      symbol: options.config?.symbol ?? 'BTC/USD',
      timeframe: options.config?.timeframe ?? '1h',
      initialBalance: options.config?.initialBalance ?? 100000,
      maxCandleHistory: options.config?.maxCandleHistory ?? 1000,
      randomSearchSamples: options.config?.randomSearchSamples ?? 20,
      rankingMetric: options.config?.rankingMetric ?? 'netProfit',
      seed: options.config?.seed ?? 123456,
    };

    this.parameterSpace = new ParameterSpace(options.parameterRanges ?? []);
  }

  // --- Engine Lifecycle Implementation ---

  public initialize(): void {
    this.state = 'IDLE';
    this.results = [];
    this.cancellationToken.reset();
  }

  public getVersion(): string {
    return '0.1.0';
  }

  public getHealth(): EngineHealth {
    return {
      healthy: true,
      version: this.getVersion(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      objectCount: this.results.length,
    };
  }

  public reset(): void {
    this.state = 'IDLE';
    this.results = [];
    this.tracker.reset();
    this.cancellationToken.reset();
    this.runDurationMs = 0;
  }

  public destroy(): void {
    this.reset();
    this.emitter.clear();
  }

  // --- Snapshot Provider Implementation ---

  public getSnapshot(): OptimizationSnapshotData {
    return OptimizationSnapshot.create(
      this.state,
      this.tracker.getProgress().completedRuns,
      this.tracker.getProgress().totalRuns,
      this.results,
      this.tracker.getProgress(),
      this.createdAt
    );
  }

  public restoreSnapshot(snapshot: OptimizationSnapshotData): void {
    if (snapshot.state) {
      this.state = snapshot.state;
    }
    if (Array.isArray(snapshot.results)) {
      this.results = [...snapshot.results];
    }
    if (snapshot.createdAt) {
      this.createdAt = snapshot.createdAt;
    }
  }

  // --- Public Optimization API ---

  public loadDataset(candles: Candle[]): void {
    if (!candles) {
      throw new Error('Dataset cannot be null or undefined');
    }
    this.dataset = candles;
  }

  public addParameterRange(range: ParameterRange): void {
    const val = ParameterValidator.validateRange(range);
    if (!val.valid) {
      throw new Error(`Invalid parameter range: ${val.error}`);
    }
    this.parameterSpace.addRange(range);
  }

  public clearParameterSpace(): void {
    this.parameterSpace.clear();
  }

  public getState(): OptimizationState {
    return this.state;
  }

  public getProgress(): OptimizationProgressData {
    return this.tracker.getProgress();
  }

  public pause(): void {
    if (this.state === 'RUNNING') {
      this.cancellationToken.pause();
      this.state = 'PAUSED';
    }
  }

  public resume(): void {
    if (this.state === 'PAUSED') {
      this.cancellationToken.resume();
      this.state = 'RUNNING';
    }
  }

  public cancel(): void {
    if (this.state === 'RUNNING' || this.state === 'PAUSED') {
      this.cancellationToken.cancel();
      this.state = 'CANCELLED';
      const progress = this.tracker.getProgress();
      this.emitter.emit('optimization.cancelled', {
        completedRuns: progress.completedRuns,
        totalRuns: progress.totalRuns,
      });
    }
  }

  /**
   * Main entrypoint to execute optimization over parameter space
   */
  public run(
    strategyFactory: StrategyFactory,
    customComparator?: CustomComparator
  ): OptimizationReport {
    // 1. Validate parameter space
    const ranges = this.parameterSpace.getRanges() as ParameterRange[];
    const spaceVal = ParameterValidator.validateSpace(ranges);
    if (!spaceVal.valid) {
      this.state = 'ERROR';
      const err = spaceVal.error ?? 'Invalid parameter space';
      this.emitter.emit('optimization.failed', { error: err });
      throw new Error(`Optimization failed: ${err}`);
    }

    if (!this.dataset || this.dataset.length === 0) {
      this.state = 'ERROR';
      const err = 'Dataset is empty';
      this.emitter.emit('optimization.failed', { error: err });
      throw new Error(`Optimization failed: ${err}`);
    }

    // 2. Generate combinations
    const combinations = ParameterGenerator.generate(
      ranges,
      this.config.mode,
      this.config.randomSearchSamples,
      this.config.seed
    );

    if (combinations.length === 0) {
      this.state = 'ERROR';
      const err = 'No parameter combinations generated';
      this.emitter.emit('optimization.failed', { error: err });
      throw new Error(`Optimization failed: ${err}`);
    }

    // 3. Initialize execution state & tracker
    this.state = 'RUNNING';
    this.cancellationToken.reset();
    this.results = [];
    this.tracker.start(combinations.length);

    this.emitter.emit('optimization.started', {
      mode: this.config.mode,
      totalRuns: combinations.length,
    });

    const startTime = Date.now();
    const runner = new OptimizationRunner(
      this.config,
      this.dataset,
      strategyFactory,
      this.cancellationToken,
      this.emitter,
      this.tracker
    );

    // 4. Orchestrate backtest runs
    for (let i = 0; i < combinations.length; i++) {
      if (this.cancellationToken.isCancelled()) {
        this.state = 'CANCELLED';
        break;
      }

      const params = combinations[i];
      const runSeed = (this.config.seed ?? 123456) + i;

      try {
        const item = runner.runSingle(i, combinations.length, params, runSeed);
        this.results.push(item);
      } catch (err: any) {
        this.state = 'ERROR';
        const errMsg = err?.message ?? String(err);
        this.emitter.emit('optimization.failed', { error: errMsg });
        throw new Error(`Run ${i + 1} failed: ${errMsg}`);
      }
    }

    this.runDurationMs = Date.now() - startTime;

    // 5. Rank results
    const rankedResults = ResultRanking.rank(
      this.results,
      this.config.rankingMetric,
      customComparator
    );
    this.results = rankedResults;

    if (this.state === 'RUNNING') {
      this.state = 'COMPLETED';
      const best = rankedResults.length > 0 ? rankedResults[0] : undefined;
      this.emitter.emit('optimization.completed', {
        totalCompleted: rankedResults.length,
        bestResult: best,
      });
    }

    return new OptimizationReport(
      this.results,
      this.config.rankingMetric ?? 'netProfit',
      this.runDurationMs
    );
  }

  // --- Getters ---

  public getResults(): OptimizationResultItem[] {
    return this.results;
  }

  public getReport(): OptimizationReport {
    return new OptimizationReport(
      this.results,
      this.config.rankingMetric ?? 'netProfit',
      this.runDurationMs
    );
  }

  public getParameterSpace(): ParameterSpace {
    return this.parameterSpace;
  }

  // --- Event Handling ---

  public on<K extends OptimizationEventType>(
    event: K,
    listener: OptimizationEventListener<K>
  ): () => void {
    return this.emitter.on(event, listener);
  }

  public off<K extends OptimizationEventType>(
    event: K,
    listener: OptimizationEventListener<K>
  ): void {
    this.emitter.off(event, listener);
  }
}
