import { EngineHealth, EngineLifecycle, SnapshotProvider } from '@tradeflow/core';
import { Candle } from '@tradeflow/shared';
import { ValidationResult } from '@tradeflow/trading-domain';
import { ExecutionEngine, ExecutionTarget } from '@tradeflow/execution-engine';
import { MarketDataEngine } from '@tradeflow/market-data';
import { OrderManagementEngine } from '@tradeflow/order-management';
import { PaperTradingEngine } from '@tradeflow/paper-trading';
import { PortfolioEngine } from '@tradeflow/portfolio-engine';
import { RiskEngine } from '@tradeflow/risk-engine';
import { StrategyEngine } from '@tradeflow/strategy-engine';

import { HistoricalDataset } from '../dataset/HistoricalDataset.ts';
import { BacktestEventEmitter, BacktestEventListener, BacktestEventType } from '../events/BacktestEvents.ts';
import { PlaybackController } from '../playback/PlaybackController.ts';
import { BacktestReport } from '../report/BacktestReport.ts';
import { BacktestRunner } from '../runner/BacktestRunner.ts';
import { BacktestStatistics } from '../statistics/BacktestStatistics.ts';
import { SimulationClock } from '../timeline/SimulationClock.ts';
import {
  BacktestConfig,
  BacktestReportMetrics,
  BacktestSnapshotData,
  BacktestState,
  PlaybackSpeed,
} from '../types/index.ts';
import { BacktestValidator } from '../validation/BacktestValidator.ts';

export interface BacktestingEngineOptions {
  config?: Partial<BacktestConfig>;
  strategyEngine?: StrategyEngine;
  oms?: OrderManagementEngine;
  paperTrading?: PaperTradingEngine;
  portfolio?: PortfolioEngine;
  marketData?: MarketDataEngine;
  riskEngine?: RiskEngine;
  executionEngine?: ExecutionEngine;
}

export class BacktestingEngine
  implements SnapshotProvider<BacktestSnapshotData>, EngineLifecycle {
  private config: BacktestConfig;
  private dataset: HistoricalDataset = new HistoricalDataset();
  private clock: SimulationClock;
  private playback: PlaybackController;
  private validator: BacktestValidator = new BacktestValidator();
  private emitter: BacktestEventEmitter = new BacktestEventEmitter();

  private strategyEngine: StrategyEngine;
  private oms: OrderManagementEngine;
  private paperTrading: PaperTradingEngine;
  private portfolioEngine: PortfolioEngine;
  private marketDataEngine: MarketDataEngine;
  private riskEngine: RiskEngine;
  private executionEngine: ExecutionEngine;

  private runner!: BacktestRunner;
  private startTime: number = Date.now();
  private targetId: string = 'backtest-paper-target';

  constructor(options: BacktestingEngineOptions = {}) {
    this.config = {
      symbol: options.config?.symbol ?? 'BTC/USD',
      timeframe: options.config?.timeframe ?? '1h',
      initialBalance: options.config?.initialBalance ?? 100000,
      playbackSpeed: options.config?.playbackSpeed ?? 'UNLIMITED',
      maxCandleHistory: options.config?.maxCandleHistory ?? 1000,
    };

    // Initialize clock and playback controller
    this.clock = new SimulationClock(this.dataset);
    this.playback = new PlaybackController(this.clock);
    if (this.config.playbackSpeed) {
      this.playback.setSpeed(this.config.playbackSpeed);
    }

    // Initialize or assign engines
    this.strategyEngine = options.strategyEngine ?? new StrategyEngine();
    this.riskEngine = options.riskEngine ?? new RiskEngine();
    this.portfolioEngine =
      options.portfolio ??
      new PortfolioEngine({ initialBalance: this.config.initialBalance });
    this.paperTrading =
      options.paperTrading ??
      new PaperTradingEngine({
        initialBalance: this.config.initialBalance,
        currency: 'USD',
      });
    this.executionEngine = options.executionEngine ?? new ExecutionEngine();
    this.oms =
      options.oms ??
      new OrderManagementEngine(this.riskEngine, undefined, this.executionEngine);
    this.marketDataEngine = options.marketData ?? new MarketDataEngine();

    // Register Paper Trading as execution target in OMS / Execution Engine
    this.setupExecutionTarget();

    // Setup BacktestRunner
    this.recreateRunner();
  }

  /**
   * Registers Paper Trading Engine as an execution target
   */
  private setupExecutionTarget(): void {
    const target: ExecutionTarget = {
      id: this.targetId,
      name: 'Backtest Paper Target',
      type: 'SIMULATED',
      supportedOrderTypes: ['MARKET' as any, 'LIMIT' as any],
      isAvailable: () => true,
      executeOrder: (order) => {
        const placed = this.paperTrading.placeOrder({
          symbol: order.symbol,
          side: order.side as any,
          type: order.type as any,
          quantity: order.quantity,
          price: order.price,
        });
        return {
          requestId: order.id,
          targetId: this.targetId,
          status: 'COMPLETED' as any,
          executionId: `exec-${placed.id}`,
          timestamp: new Date().toISOString(),
        };
      },
      getAccountState: () => {
        const state = this.paperTrading.getAccountState();
        return {
          balance: state.balance,
          equity: state.balance,
          availableMargin: state.availableMargin,
          usedMargin: state.usedMargin,
          currency: state.currency,
        };
      },
      getOpenPositions: () => this.paperTrading.getOpenPositions() as any,
    };

    this.oms.registerExecutionTarget(target);
  }

  private recreateRunner(): void {
    this.runner = new BacktestRunner(
      this.config,
      this.dataset,
      this.clock,
      this.strategyEngine,
      this.oms,
      this.paperTrading,
      this.portfolioEngine,
      this.emitter,
      this.targetId
    );
  }

  // --- Engine Lifecycle Implementation ---

  public initialize(): void {
    this.strategyEngine.initialize();
    this.oms.initialize();
    this.paperTrading.initialize();
    this.portfolioEngine.initialize();
  }

  public getVersion(): string {
    return '0.1.0';
  }

  public getHealth(): EngineHealth {
    return {
      healthy: true,
      version: this.getVersion(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      objectCount: this.dataset.length(),
    };
  }

  public reset(): void {
    this.clock.reset();
    this.playback.stop();
    this.portfolioEngine.reset(this.config.initialBalance);
    this.paperTrading.reset();
    this.oms.reset();
    this.strategyEngine.reset();
    this.recreateRunner();
  }

  public destroy(): void {
    this.reset();
    this.emitter.clear();
  }

  // --- Snapshot Provider Implementation ---

  public getSnapshot(): BacktestSnapshotData {
    return {
      state: this.playback.getState(),
      currentIndex: this.clock.currentIndex(),
      currentTime: this.clock.currentTime(),
      speed: this.playback.getSpeed(),
      candlesCount: this.dataset.length(),
      timestamp: new Date().toISOString(),
    };
  }

  public restoreSnapshot(snapshot: BacktestSnapshotData): void {
    this.playback.setSpeed(snapshot.speed);
    if (snapshot.currentIndex >= 0) {
      this.clock.seek(snapshot.currentIndex);
    }
    this.playback.setState(snapshot.state);
  }

  // --- Public Backtesting API ---

  /**
   * Loads historical candle dataset into backtester
   */
  public loadDataset(candles: Candle[]): void {
    this.dataset.load(candles);
    this.clock.reset();
    this.playback.stop();
    this.recreateRunner();
  }

  /**
   * Validates current configuration and dataset readiness
   */
  public validate(): ValidationResult {
    return this.validator.validateEngineReady(this.config, this.dataset);
  }

  /**
   * Runs backtest from current position to completion
   */
  public run(): void {
    const valResult = this.validate();
    if (!valResult.valid) {
      const errStr = valResult.errors.map((e) => e.message).join('; ');
      this.emitter.emit('backtest.error', { error: errStr });
      throw new Error(`Backtest run validation failed: ${errStr}`);
    }

    if (this.clock.currentIndex() < 0) {
      this.clock.start(0);
    } else {
      this.clock.resume();
    }

    this.playback.setState('RUNNING');
    this.emitter.emit('backtest.started', {
      symbol: this.config.symbol,
      timeframe: this.config.timeframe,
      totalCandles: this.dataset.length(),
    });

    // Execute simulation steps
    while (this.playback.getState() === 'RUNNING') {
      const stepped = this.runner.step();
      if (!stepped) {
        break;
      }

      const hasNext = this.clock.next();
      if (!hasNext) {
        break;
      }
    }

    if (this.playback.getState() === 'RUNNING') {
      this.playback.setState('COMPLETED');
      const report = this.generateReport();
      this.emitter.emit('backtest.completed', { report: report.getMetrics() });
      this.emitter.emit('backtest.finished', {
        state: 'COMPLETED',
        index: this.clock.currentIndex(),
      });
    }
  }

  /**
   * Alias for run()
   */
  public runAll(): void {
    this.run();
  }

  /**
   * Pauses running backtest
   */
  public pause(): void {
    this.playback.pause();
    this.emitter.emit('backtest.paused', {
      index: this.clock.currentIndex(),
      timestamp: this.clock.currentTime(),
    });
  }

  /**
   * Resumes paused backtest
   */
  public resume(): void {
    this.playback.resume();
    this.emitter.emit('backtest.resumed', {
      index: this.clock.currentIndex(),
      timestamp: this.clock.currentTime(),
    });
    if (this.playback.getSpeed() === 'UNLIMITED') {
      this.run();
    }
  }

  /**
   * Steps single candle forward
   */
  public step(): boolean {
    if (this.clock.currentIndex() < 0) {
      this.clock.start(0);
    }

    const stepped = this.runner.step();
    if (stepped) {
      this.clock.next();
    } else {
      this.playback.setState('COMPLETED');
    }
    return stepped;
  }

  /**
   * Stops active backtest
   */
  public stop(): void {
    this.playback.stop();
    this.emitter.emit('backtest.finished', {
      state: 'STOPPED',
      index: this.clock.currentIndex(),
    });
  }

  /**
   * Seeks simulation clock to specified candle index
   */
  public seek(index: number): boolean {
    return this.clock.seek(index);
  }

  /**
   * Sets playback speed
   */
  public setPlaybackSpeed(speed: PlaybackSpeed): void {
    this.playback.setSpeed(speed);
    this.emitter.emit('backtest.speed.changed', { speed });
  }

  /**
   * Generates immutable BacktestReport object
   */
  public generateReport(): BacktestReport {
    const totalCandles = this.dataset.length();
    const startDate = totalCandles > 0 ? this.dataset.get(0)?.time ?? '' : '';
    const endDate =
      totalCandles > 0 ? this.dataset.get(totalCandles - 1)?.time ?? '' : '';

    const metrics = BacktestStatistics.compute(
      this.portfolioEngine,
      startDate,
      endDate,
      totalCandles,
      this.config.initialBalance ?? 100000
    );

    return new BacktestReport(metrics);
  }

  // --- Engine Getters ---

  public getDataset(): HistoricalDataset {
    return this.dataset;
  }

  public getClock(): SimulationClock {
    return this.clock;
  }

  public getPlayback(): PlaybackController {
    return this.playback;
  }

  public getPortfolio(): PortfolioEngine {
    return this.portfolioEngine;
  }

  public getStrategyEngine(): StrategyEngine {
    return this.strategyEngine;
  }

  public getOMS(): OrderManagementEngine {
    return this.oms;
  }

  public getPaperTrading(): PaperTradingEngine {
    return this.paperTrading;
  }

  public getState(): BacktestState {
    return this.playback.getState();
  }

  // --- Event Handling ---

  public on<K extends BacktestEventType>(
    event: K,
    listener: BacktestEventListener<K>
  ): () => void {
    return this.emitter.on(event, listener);
  }

  public off<K extends BacktestEventType>(
    event: K,
    listener: BacktestEventListener<K>
  ): void {
    this.emitter.off(event, listener);
  }
}
