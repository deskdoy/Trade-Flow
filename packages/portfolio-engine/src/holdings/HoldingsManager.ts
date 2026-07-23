import { HoldingsData } from '../types/index.ts';

export class HoldingsManager {
  private initialBalance: number;
  private cashBalance: number;
  private netCashAdjustments: number = 0;
  private defaultLeverage: number;
  private currentHoldings: HoldingsData;

  constructor(initialBalance: number = 100000, defaultLeverage: number = 1) {
    this.initialBalance = initialBalance;
    this.cashBalance = initialBalance;
    this.defaultLeverage = defaultLeverage;

    this.currentHoldings = {
      cashBalance: initialBalance,
      usedMargin: 0,
      freeMargin: initialBalance,
      buyingPower: initialBalance * defaultLeverage,
      totalEquity: initialBalance,
      accountExposure: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Deposits cash into account
   */
  public deposit(amount: number): HoldingsData {
    if (amount <= 0) throw new Error('Deposit amount must be positive');
    this.netCashAdjustments += amount;
    return this.recalculateHoldings(
      this.currentHoldings.usedMargin,
      0,
      this.currentHoldings.totalEquity - this.cashBalance
    );
  }

  /**
   * Withdraws cash from account
   */
  public withdraw(amount: number): HoldingsData {
    if (amount <= 0) throw new Error('Withdrawal amount must be positive');
    if (amount > this.currentHoldings.freeMargin) {
      throw new Error('Insufficient free margin for withdrawal');
    }
    this.netCashAdjustments -= amount;
    return this.recalculateHoldings(
      this.currentHoldings.usedMargin,
      0,
      this.currentHoldings.totalEquity - this.cashBalance
    );
  }

  /**
   * Recalculates holdings based on active portfolio state
   */
  public recalculateHoldings(
    usedMargin: number,
    totalPositionValue: number,
    unrealizedPnl: number,
    totalRealizedPnl: number = 0
  ): HoldingsData {
    // Current cash balance = initial balance + realized PnL + net cash adjustments
    const currentCash = this.initialBalance + totalRealizedPnl + this.netCashAdjustments;
    this.cashBalance = currentCash;

    const totalEquity = currentCash + unrealizedPnl;
    const freeMargin = Math.max(0, totalEquity - usedMargin);
    const buyingPower = freeMargin * Math.max(1, this.defaultLeverage);
    const accountExposure = totalEquity > 0 ? totalPositionValue / totalEquity : 0;

    this.currentHoldings = {
      cashBalance: currentCash,
      usedMargin,
      freeMargin,
      buyingPower,
      totalEquity,
      accountExposure,
      updatedAt: new Date().toISOString(),
    };

    return { ...this.currentHoldings };
  }

  /**
   * Returns copy of current holdings
   */
  public getHoldings(): HoldingsData {
    return { ...this.currentHoldings };
  }

  /**
   * Restores holdings state from snapshot
   */
  public restore(holdings: HoldingsData): void {
    this.cashBalance = holdings.cashBalance;
    this.currentHoldings = { ...holdings };
  }

  /**
   * Resets holdings to initial balance
   */
  public reset(initialBalance?: number): void {
    if (initialBalance !== undefined) {
      this.initialBalance = initialBalance;
    }
    this.netCashAdjustments = 0;
    this.cashBalance = this.initialBalance;
    this.currentHoldings = {
      cashBalance: this.cashBalance,
      usedMargin: 0,
      freeMargin: this.cashBalance,
      buyingPower: this.cashBalance * this.defaultLeverage,
      totalEquity: this.cashBalance,
      accountExposure: 0,
      updatedAt: new Date().toISOString(),
    };
  }
}
