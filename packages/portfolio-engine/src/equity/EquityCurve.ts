import { DailyEquityPoint, EquityData, EquityPoint } from '../types/index.ts';

export class EquityCurve {
  private currentEquity: number;
  private balance: number;
  private unrealizedPnl: number;
  private realizedPnl: number;
  private peakEquity: number;
  private maxDrawdown: number;
  private maxDrawdownPercent: number;
  private history: EquityPoint[] = [];
  private dailyEquityMap: Map<string, DailyEquityPoint> = new Map();
  private maxHistoryPoints: number;

  constructor(initialBalance: number = 100000, maxHistoryPoints: number = 1000) {
    this.currentEquity = initialBalance;
    this.balance = initialBalance;
    this.unrealizedPnl = 0;
    this.realizedPnl = 0;
    this.peakEquity = initialBalance;
    this.maxDrawdown = 0;
    this.maxDrawdownPercent = 0;
    this.maxHistoryPoints = maxHistoryPoints;

    const now = new Date().toISOString();
    this.recordEquityPoint(now, initialBalance, initialBalance, 0, 0);
  }

  /**
   * Records a new equity point and updates peak & drawdown statistics
   */
  public recordEquityPoint(
    timestamp: string,
    equity: number,
    balance: number,
    unrealizedPnl: number,
    realizedPnl: number
  ): EquityData {
    this.currentEquity = equity;
    this.balance = balance;
    this.unrealizedPnl = unrealizedPnl;
    this.realizedPnl = realizedPnl;

    // Peak equity update
    if (equity > this.peakEquity) {
      this.peakEquity = equity;
    }

    // Current drawdown calculations
    const currentDrawdown = Math.max(0, this.peakEquity - equity);
    const currentDrawdownPercent =
      this.peakEquity > 0 ? (currentDrawdown / this.peakEquity) * 100 : 0;

    if (currentDrawdown > this.maxDrawdown) {
      this.maxDrawdown = currentDrawdown;
    }
    if (currentDrawdownPercent > this.maxDrawdownPercent) {
      this.maxDrawdownPercent = currentDrawdownPercent;
    }

    const point: EquityPoint = {
      timestamp,
      equity,
      balance,
      drawdown: currentDrawdown,
      drawdownPercent: currentDrawdownPercent,
    };

    this.history.push(point);
    if (this.history.length > this.maxHistoryPoints) {
      this.history.shift();
    }

    // Update Daily Equity OHLC
    const dateStr = timestamp.split('T')[0] || new Date().toISOString().split('T')[0];
    const existingDaily = this.dailyEquityMap.get(dateStr);

    if (!existingDaily) {
      this.dailyEquityMap.set(dateStr, {
        date: dateStr,
        openEquity: equity,
        highEquity: equity,
        lowEquity: equity,
        closeEquity: equity,
      });
    } else {
      this.dailyEquityMap.set(dateStr, {
        date: dateStr,
        openEquity: existingDaily.openEquity,
        highEquity: Math.max(existingDaily.highEquity, equity),
        lowEquity: Math.min(existingDaily.lowEquity, equity),
        closeEquity: equity,
      });
    }

    return this.getEquityData();
  }

  /**
   * Returns complete EquityData structure
   */
  public getEquityData(): EquityData {
    return {
      currentEquity: this.currentEquity,
      balance: this.balance,
      unrealizedPnl: this.unrealizedPnl,
      realizedPnl: this.realizedPnl,
      peakEquity: this.peakEquity,
      maxDrawdown: this.maxDrawdown,
      maxDrawdownPercent: this.maxDrawdownPercent,
      equityHistory: [...this.history],
      dailyEquity: Array.from(this.dailyEquityMap.values()),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Restores state from snapshot
   */
  public restore(equityData: EquityData): void {
    this.currentEquity = equityData.currentEquity;
    this.balance = equityData.balance;
    this.unrealizedPnl = equityData.unrealizedPnl;
    this.realizedPnl = equityData.realizedPnl;
    this.peakEquity = equityData.peakEquity;
    this.maxDrawdown = equityData.maxDrawdown;
    this.maxDrawdownPercent = equityData.maxDrawdownPercent;
    this.history = equityData.equityHistory ? [...equityData.equityHistory] : [];

    this.dailyEquityMap.clear();
    if (equityData.dailyEquity) {
      for (const d of equityData.dailyEquity) {
        this.dailyEquityMap.set(d.date, { ...d });
      }
    }
  }

  /**
   * Resets equity curve
   */
  public reset(initialBalance: number = 100000): void {
    this.currentEquity = initialBalance;
    this.balance = initialBalance;
    this.unrealizedPnl = 0;
    this.realizedPnl = 0;
    this.peakEquity = initialBalance;
    this.maxDrawdown = 0;
    this.maxDrawdownPercent = 0;
    this.history = [];
    this.dailyEquityMap.clear();

    const now = new Date().toISOString();
    this.recordEquityPoint(now, initialBalance, initialBalance, 0, 0);
  }
}
