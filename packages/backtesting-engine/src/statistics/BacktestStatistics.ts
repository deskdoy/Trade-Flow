import { PortfolioEngine } from '@tradeflow/portfolio-engine';
import { BacktestReportMetrics } from '../types/index.ts';

export class BacktestStatistics {
  public static compute(
    portfolioEngine: PortfolioEngine,
    startDate: string,
    endDate: string,
    totalCandles: number,
    initialBalance: number
  ): BacktestReportMetrics {
    const holdings = portfolioEngine.getHoldings();
    const equityData = portfolioEngine.getEquity();
    const perf = portfolioEngine.getPerformance();
    const stats = portfolioEngine.getStatistics();

    return {
      startDate,
      endDate,
      totalCandles,
      totalTrades: stats.totalTrades ?? 0,
      winningTrades: stats.winningTrades ?? 0,
      losingTrades: stats.losingTrades ?? 0,
      winRate: perf.winRate ?? 0,
      profitFactor: perf.profitFactor ?? 0,
      maxDrawdown: equityData.maxDrawdown ?? 0,
      maxDrawdownPercent: equityData.maxDrawdownPercent ?? 0,
      netProfit: perf.netProfit ?? 0,
      grossProfit: perf.grossProfit ?? 0,
      grossLoss: perf.grossLoss ?? 0,
      expectancy: stats.expectancy ?? 0,
      sharpeRatio: perf.sharpeRatio ?? 0,
      sortinoRatio: perf.sortinoRatio ?? 0,
      initialBalance,
      finalBalance: holdings.cashBalance ?? initialBalance,
      finalEquity: holdings.totalEquity ?? initialBalance,
    };
  }
}
