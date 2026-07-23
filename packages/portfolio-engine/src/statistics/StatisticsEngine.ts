import { ClosedPositionRecord, TradingStatistics } from '../types/index.ts';

export class StatisticsEngine {
  private stats: TradingStatistics;

  constructor() {
    this.stats = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      largestWin: 0,
      largestLoss: 0,
      longestWinningStreak: 0,
      longestLosingStreak: 0,
      currentWinningStreak: 0,
      currentLosingStreak: 0,
    };
  }

  /**
   * Recalculates statistics based on all closed positions
   */
  public recalculate(closedPositions: ClosedPositionRecord[]): TradingStatistics {
    const totalTrades = closedPositions.length;
    let winningTrades = 0;
    let losingTrades = 0;
    let largestWin = 0;
    let largestLoss = 0;

    let longestWinningStreak = 0;
    let longestLosingStreak = 0;
    let currentWinningStreak = 0;
    let currentLosingStreak = 0;

    for (const pos of closedPositions) {
      if (pos.realizedPnl > 0) {
        winningTrades += 1;
        if (pos.realizedPnl > largestWin) {
          largestWin = pos.realizedPnl;
        }

        currentWinningStreak += 1;
        currentLosingStreak = 0;

        if (currentWinningStreak > longestWinningStreak) {
          longestWinningStreak = currentWinningStreak;
        }
      } else if (pos.realizedPnl < 0) {
        losingTrades += 1;
        const lossAmount = Math.abs(pos.realizedPnl);
        if (lossAmount > largestLoss) {
          largestLoss = lossAmount;
        }

        currentLosingStreak += 1;
        currentWinningStreak = 0;

        if (currentLosingStreak > longestLosingStreak) {
          longestLosingStreak = currentLosingStreak;
        }
      } else {
        // Break-even trade resets current streaks
        currentWinningStreak = 0;
        currentLosingStreak = 0;
      }
    }

    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    this.stats = {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      largestWin,
      largestLoss,
      longestWinningStreak,
      longestLosingStreak,
      currentWinningStreak,
      currentLosingStreak,
    };

    return { ...this.stats };
  }

  /**
   * Returns current statistics
   */
  public getStatistics(): TradingStatistics {
    return { ...this.stats };
  }

  /**
   * Restores state from snapshot
   */
  public restore(stats: TradingStatistics): void {
    this.stats = { ...stats };
  }

  /**
   * Resets statistics
   */
  public clear(): void {
    this.stats = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      largestWin: 0,
      largestLoss: 0,
      longestWinningStreak: 0,
      longestLosingStreak: 0,
      currentWinningStreak: 0,
      currentLosingStreak: 0,
    };
  }
}
