import { PositionData } from '@tradeflow/trading-domain';
import { EquityCurve } from '../equity/EquityCurve.ts';
import { PortfolioEventEmitter, PortfolioEventListener, PortfolioEventType } from '../events/PortfolioEvents.ts';
import { HoldingsManager } from '../holdings/HoldingsManager.ts';
import { PerformanceTracker } from '../pnl/PerformanceTracker.ts';
import { PositionBook } from '../positions/PositionBook.ts';
import { PortfolioSnapshot } from '../snapshots/PortfolioSnapshot.ts';
import { StatisticsEngine } from '../statistics/StatisticsEngine.ts';
import {
  ClosedPositionRecord,
  EquityData,
  HoldingsData,
  PerformanceMetrics,
  PortfolioEngineOptions,
  PortfolioSnapshotData,
  TradingStatistics,
} from '../types/index.ts';

export class PortfolioEngine {
  private positionBook: PositionBook = new PositionBook();
  private holdingsManager: HoldingsManager;
  private equityCurve: EquityCurve;
  private performanceTracker: PerformanceTracker = new PerformanceTracker();
  private statisticsEngine: StatisticsEngine = new StatisticsEngine();
  private emitter: PortfolioEventEmitter = new PortfolioEventEmitter();

  constructor(options: PortfolioEngineOptions = {}) {
    const initialBalance = options.initialBalance ?? 100000;
    const defaultLeverage = options.defaultLeverage ?? 1;
    const maxEquityHistoryPoints = options.maxEquityHistoryPoints ?? 1000;

    this.holdingsManager = new HoldingsManager(initialBalance, defaultLeverage);
    this.equityCurve = new EquityCurve(initialBalance, maxEquityHistoryPoints);
  }

  // --- Public Getters ---

  public getPositions(): PositionData[] {
    return this.positionBook.getOpenPositions();
  }

  public getClosedPositions(): ClosedPositionRecord[] {
    return this.positionBook.getClosedPositions();
  }

  public getHoldings(): HoldingsData {
    return this.holdingsManager.getHoldings();
  }

  public getEquity(): EquityData {
    return this.equityCurve.getEquityData();
  }

  public getPerformance(): PerformanceMetrics {
    return this.performanceTracker.getPerformanceMetrics();
  }

  public getStatistics(): TradingStatistics {
    return this.statisticsEngine.getStatistics();
  }

  /**
   * Generates a complete serializable snapshot of the portfolio
   */
  public getSnapshot(): PortfolioSnapshotData {
    return {
      positions: this.getPositions(),
      closedPositions: this.getClosedPositions(),
      holdings: this.getHoldings(),
      equity: this.getEquity(),
      statistics: this.getStatistics(),
      performance: this.getPerformance(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Restores full portfolio state from snapshot
   */
  public restoreSnapshot(snapshot: PortfolioSnapshotData | string): void {
    const data =
      typeof snapshot === 'string'
        ? PortfolioSnapshot.deserialize(snapshot)
        : snapshot;

    this.positionBook.restore(data.positions, data.closedPositions);
    this.holdingsManager.restore(data.holdings);
    this.equityCurve.restore(data.equity);
    this.statisticsEngine.restore(data.statistics);
    this.performanceTracker.restore(data.performance);

    this.emitUpdated();
  }

  // --- Portfolio Operations ---

  /**
   * Updates mark price for a symbol and recalculates equity & holdings
   */
  public updateMarkPrice(symbol: string, price: number): void {
    const updatedPositions = this.positionBook.updateMarkPrice(symbol, price);
    this.recalculateState();

    for (const pos of updatedPositions) {
      this.emitter.emit('portfolio.position.updated', { position: pos });
    }
  }

  /**
   * Opens or updates an active open position
   */
  public openPosition(position: PositionData): PositionData {
    const added = this.positionBook.addOrUpdatePosition(position);
    this.recalculateState();

    this.emitter.emit('portfolio.position.opened', { position: added });
    this.emitUpdated();
    return added;
  }

  /**
   * Closes an open position by ID or symbol
   */
  public closePosition(
    positionIdOrSymbol: string,
    exitPrice: number,
    closedAt?: string
  ): ClosedPositionRecord | undefined {
    const closed = this.positionBook.closePosition(positionIdOrSymbol, exitPrice, closedAt);
    if (!closed) return undefined;

    const closedList = this.positionBook.getClosedPositions();
    const perf = this.performanceTracker.recalculate(closedList);
    const stats = this.statisticsEngine.recalculate(closedList);

    this.recalculateState();

    this.emitter.emit('portfolio.position.closed', { closedPosition: closed });
    this.emitter.emit('portfolio.performance.updated', { performance: perf });
    this.emitter.emit('portfolio.statistics.updated', { statistics: stats });
    this.emitUpdated();

    return closed;
  }

  /**
   * Deposits funds into portfolio
   */
  public deposit(amount: number): HoldingsData {
    const holdings = this.holdingsManager.deposit(amount);
    this.recalculateState();
    this.emitter.emit('portfolio.holdings.updated', { holdings });
    this.emitUpdated();
    return holdings;
  }

  /**
   * Withdraws funds from portfolio
   */
  public withdraw(amount: number): HoldingsData {
    const holdings = this.holdingsManager.withdraw(amount);
    this.recalculateState();
    this.emitter.emit('portfolio.holdings.updated', { holdings });
    this.emitUpdated();
    return holdings;
  }

  /**
   * Resets portfolio engine state to clean initial balance
   */
  public reset(initialBalance?: number): void {
    this.positionBook.clear();
    this.performanceTracker.clear();
    this.statisticsEngine.clear();
    this.holdingsManager.reset(initialBalance);
    this.equityCurve.reset(initialBalance || 100000);
    this.emitUpdated();
  }

  // --- Internal State Calculation & Events ---

  private recalculateState(): void {
    const usedMargin = this.positionBook.getTotalUsedMargin();
    const totalPosValue = this.positionBook.getTotalPositionValue();
    const unrealizedPnl = this.positionBook.getAggregateUnrealizedPnl();
    const realizedPnl = this.positionBook.getAggregateRealizedPnl();

    const holdings = this.holdingsManager.recalculateHoldings(
      usedMargin,
      totalPosValue,
      unrealizedPnl,
      realizedPnl
    );

    const equity = this.equityCurve.recordEquityPoint(
      new Date().toISOString(),
      holdings.totalEquity,
      holdings.cashBalance,
      unrealizedPnl,
      realizedPnl
    );

    this.emitter.emit('portfolio.holdings.updated', { holdings });
    this.emitter.emit('portfolio.equity.updated', { equity });
  }

  private emitUpdated(): void {
    this.emitter.emit('portfolio.updated', { snapshot: this.getSnapshot() });
  }

  // --- Event Subscriptions ---

  public on<K extends PortfolioEventType>(
    event: K,
    listener: PortfolioEventListener<K>
  ): () => void {
    return this.emitter.on(event, listener);
  }

  public off<K extends PortfolioEventType>(
    event: K,
    listener: PortfolioEventListener<K>
  ): void {
    this.emitter.off(event, listener);
  }
}
