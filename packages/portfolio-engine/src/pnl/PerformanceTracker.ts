import { ClosedPositionRecord, PerformanceMetrics } from '../types/index.ts';

export class PerformanceTracker {
  private metrics: PerformanceMetrics;

  constructor() {
    this.metrics = {
      netProfit: 0,
      grossProfit: 0,
      grossLoss: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      expectancy: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
    };
  }

  /**
   * Recalculates performance metrics from all closed positions
   */
  public recalculate(closedPositions: ClosedPositionRecord[]): PerformanceMetrics {
    let grossProfit = 0;
    let grossLoss = 0;
    let winCount = 0;
    let lossCount = 0;
    const returns: number[] = [];
    const downsideReturns: number[] = [];

    for (const pos of closedPositions) {
      returns.push(pos.realizedPnl);
      if (pos.realizedPnl > 0) {
        grossProfit += pos.realizedPnl;
        winCount += 1;
      } else if (pos.realizedPnl < 0) {
        const loss = Math.abs(pos.realizedPnl);
        grossLoss += loss;
        lossCount += 1;
        downsideReturns.push(loss);
      }
    }

    const netProfit = grossProfit - grossLoss;
    const totalTrades = closedPositions.length;
    const averageWin = winCount > 0 ? grossProfit / winCount : 0;
    const averageLoss = lossCount > 0 ? grossLoss / lossCount : 0;
    const winRate = totalTrades > 0 ? winCount / totalTrades : 0;
    const lossRate = totalTrades > 0 ? lossCount / totalTrades : 0;

    const profitFactor =
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;

    const expectancy = winRate * averageWin - lossRate * averageLoss;

    // Placeholder / Simplified Sharpe and Sortino ratios
    const sharpeRatio = this.calculateSharpeRatio(returns);
    const sortinoRatio = this.calculateSortinoRatio(returns, downsideReturns);

    this.metrics = {
      netProfit,
      grossProfit,
      grossLoss,
      averageWin,
      averageLoss,
      profitFactor,
      expectancy,
      sharpeRatio,
      sortinoRatio,
    };

    return { ...this.metrics };
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);
    return stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0;
  }

  private calculateSortinoRatio(returns: number[], downsideReturns: number[]): number {
    if (returns.length < 2 || downsideReturns.length === 0) return 0;
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const downsideVariance =
      downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / returns.length;
    const downsideStdDev = Math.sqrt(downsideVariance);
    return downsideStdDev > 0 ? (mean / downsideStdDev) * Math.sqrt(252) : 0;
  }

  /**
   * Returns current performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Restores state from snapshot
   */
  public restore(metrics: PerformanceMetrics): void {
    this.metrics = { ...metrics };
  }

  /**
   * Resets performance metrics
   */
  public clear(): void {
    this.metrics = {
      netProfit: 0,
      grossProfit: 0,
      grossLoss: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      expectancy: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
    };
  }
}
