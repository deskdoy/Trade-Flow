import { EngineHealth, EngineLifecycle, SnapshotProvider } from '@tradeflow/core';
import { Candle } from '@tradeflow/shared';
import { CancellationToken } from '../cancellation/CancellationToken.ts';
import { InMemoryOptimizationCache, OptimizationCacheProvider } from '../cache/OptimizationCache.ts';
import { DatasetHasher } from '../dataset/DatasetHasher.ts';
import {
  OptimizationEventEmitter,
  OptimizationEventListener,
  OptimizationEventType,
} from '../events/OptimizationEvents.ts';
import { ParameterGenerator } from '../parameters/ParameterGenerator.ts';
import { ParameterHasher } from '../parameters/ParameterHasher.ts';
import { ParameterSpace } from '../parameters/ParameterSpace.ts';
import { ParameterValidator } from '../parameters/ParameterValidator.ts';
import { ProgressTracker } from '../progress/ProgressTracker.ts';
import { RandomProvider, SeededRandomProvider } from '../random/RandomProvider.ts';
import { RankingStrategy } from '../ranking/RankingStrategy.ts';
import { CustomComparator, ResultRanking } from '../ranking/ResultRanking.ts';
import { OptimizationReport } from '../reports/OptimizationReport.ts';
import { OptimizationRunner, StrategyFactory } from '../runner/OptimizationRunner.ts';
import { ExecutionScheduler, SequentialExecutionScheduler } from '../scheduler/ExecutionScheduler.ts';
import { OptimizationSnapshot } from '../snapshots/OptimizationSnapshot.ts';
import {
  OptimizationConfig,
  OptimizationProgressData,
  OptimizationResultItem,
  OptimizationSession,
  OptimizationSnapshotData,
  OptimizationState,
  ParameterRange,
  ParameterSet,
  RankingMetric,
} from '../types/index.ts';

export interface OptimizationEngineOptions {
  config?: Partial<OptimizationConfig>;
  parameterRanges?: ParameterRange[];
  cacheProvider?: OptimizationCacheProvider;
  rankingStrategy?: RankingStrategy;
  scheduler?: ExecutionScheduler;
  randomProvider?: RandomProvider;
}

export class OptimizationEngine
  implements SnapshotProvider<OptimizationSnapshotData>, EngineLifecycle {
  private config: OptimizationConfig;
  private parameterSpace: ParameterSpace;
  private cancellationToken: CancellationToken = new CancellationToken();
  private emitter: OptimizationEventEmitter = new OptimizationEventEmitter();
  private tracker: ProgressTracker = new ProgressTracker();

  private cacheProvider?: OptimizationCacheProvider;
  private rankingStrategy?: RankingStrategy;
  private scheduler: ExecutionScheduler;
  private randomProvider: RandomProvider;

  private state: OptimizationState = 'IDLE';
  private dataset: Candle[] = [];
  private results: OptimizationResultItem[] = [];
  private startTime: number = Date.now();
  private runDurationMs: number = 0;
  private createdAt: string = new Date().toISOString();

  private sessionId: string = `opt-session-${Date.now()}`;
  private startedAt?: string;
  private finishedAt?: string;

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
      includeSnapshots: options.config?.includeSnapshots ?? false,
    };

    this.parameterSpace = new ParameterSpace(options.parameterRanges ?? []);
    this.cacheProvider = options.cacheProvider;
    this.rankingStrategy = options.rankingStrategy;
    this.scheduler = options.scheduler ?? new SequentialExecutionScheduler();
    this.randomProvider =
      options.randomProvider ?? new SeededRandomProvider(this.config.seed ?? 123456);
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
    this.sessionId = `opt-session-${Date.now()}`;
    this.startedAt = undefined;
    this.finishedAt = undefined;
  }

  public destroy(): void {
    this.reset();
    this.emitter.clear();
    if (this.cacheProvider) {
      this.cacheProvider.clear();
    }
  }

  // --- Snapshot Provider Implementation ---

  public getSnapshot(): OptimizationSnapshotData {
    const snapshot = OptimizationSnapshot.create(
      this.state,
      this.tracker.getProgress().completedRuns,
      this.tracker.getProgress().totalRuns,
      this.results,
      this.tracker.getProgress(),
      this.createdAt
    );
    snapshot.session = this.getSession();
    return snapshot;
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
    if (snapshot.session) {
      this.sessionId = snapshot.session.sessionId;
      this.startedAt = snapshot.session.startedAt;
      this.finishedAt = snapshot.session.finishedAt;
    }
  }

  // --- Public Optimization API ---

  public getSession(): OptimizationSession {
    const datasetHash = DatasetHasher.hash(this.dataset);
    const progress = this.tracker.getProgress();
    return {
      sessionId: this.sessionId,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      status: this.state,
      datasetHash,
      seed: this.config.seed ?? 123456,
      runCount: progress.totalRuns,
      completedRuns: progress.completedRuns,
      cancelledRuns: this.state === 'CANCELLED' ? 1 : 0,
      failedRuns: this.state === 'ERROR' ? 1 : 0,
    };
  }

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
      this.finishedAt = new Date().toISOString();
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
    rankingOrComparator?: RankingStrategy | RankingMetric | CustomComparator,
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
      this.randomProvider
    );

    if (combinations.length === 0) {
      this.state = 'ERROR';
      const err = 'No parameter combinations generated';
      this.emitter.emit('optimization.failed', { error: err });
      throw new Error(`Optimization failed: ${err}`);
    }

    // 3. Initialize execution state & tracker
    this.state = 'RUNNING';
    this.startedAt = new Date().toISOString();
    this.finishedAt = undefined;
    this.cancellationToken.reset();
    this.results = [];
    this.tracker.start(combinations.length);

    this.emitter.emit('optimization.started', {
      mode: this.config.mode,
      totalRuns: combinations.length,
    });

    const datasetHash = DatasetHasher.hash(this.dataset);
    const startTime = Date.now();
    const runner = new OptimizationRunner(
      this.config,
      this.dataset,
      strategyFactory,
      this.cancellationToken,
      this.emitter,
      this.tracker,
      this.scheduler
    );

    // 4. Orchestrate backtest runs with optional caching
    for (let i = 0; i < combinations.length; i++) {
      if (this.cancellationToken.isCancelled()) {
        this.state = 'CANCELLED';
        this.finishedAt = new Date().toISOString();
        break;
      }

      const params = combinations[i];
      const paramHash = ParameterHasher.hash(params);
      const cacheKey = `${datasetHash}:${paramHash}`;

      let item: OptimizationResultItem | undefined;

      if (this.cacheProvider && this.cacheProvider.has(cacheKey)) {
        item = this.cacheProvider.get(cacheKey);
      }

      if (!item) {
        const runSeed = (this.config.seed ?? 123456) + i;
        try {
          item = runner.runSingle(i, combinations.length, params, runSeed, datasetHash);
          if (this.cacheProvider) {
            this.cacheProvider.set(cacheKey, item);
          }
        } catch (err: any) {
          this.state = 'ERROR';
          this.finishedAt = new Date().toISOString();
          const errMsg = err?.message ?? String(err);
          this.emitter.emit('optimization.failed', { error: errMsg });
          throw new Error(`Run ${i + 1} failed: ${errMsg}`);
        }
      } else {
        // Record progress for cached hit
        this.tracker.recordCompletedRun();
        this.emitter.emit('optimization.progress', this.tracker.getProgress(params));
      }

      if (item) {
        this.results.push(item);
      }
    }

    this.runDurationMs = Date.now() - startTime;
    this.finishedAt = new Date().toISOString();

    // 5. Determine ranking strategy or metric
    let targetRanking: RankingStrategy | RankingMetric =
      this.rankingStrategy ?? this.config.rankingMetric ?? 'netProfit';
    let activeCustomComparator = customComparator;

    if (typeof rankingOrComparator === 'function') {
      activeCustomComparator = rankingOrComparator as CustomComparator;
    } else if (rankingOrComparator) {
      targetRanking = rankingOrComparator as RankingStrategy | RankingMetric;
    }

    // 6. Rank results
    const rankedResults = ResultRanking.rank(
      this.results,
      targetRanking,
      activeCustomComparator
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

    const rankingMetric: RankingMetric =
      typeof targetRanking === 'string'
        ? targetRanking
        : (this.config.rankingMetric ?? 'netProfit');

    return new OptimizationReport(this.results, rankingMetric, this.runDurationMs);
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
