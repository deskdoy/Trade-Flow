import { PositionData } from '@tradeflow/trading-domain';
import { UnrealizedPnL } from '../pnl/UnrealizedPnL.ts';
import { PaperAccountConfig, PaperAccountState } from '../types/index.ts';

export class AccountManager {
  private balance: number;
  private currency: string;
  private equity: number;
  private usedMargin: number;
  private freeMargin: number;
  private floatingPnL: number;

  constructor(config: PaperAccountConfig) {
    if (config.initialBalance < 0) {
      throw new Error('[AccountManager] Initial balance cannot be negative.');
    }
    this.balance = config.initialBalance;
    this.currency = config.currency || 'USDT';
    this.equity = config.initialBalance;
    this.usedMargin = 0;
    this.freeMargin = config.initialBalance;
    this.floatingPnL = 0;
  }

  public getAccountState(): PaperAccountState {
    return {
      balance: this.balance,
      equity: this.equity,
      usedMargin: this.usedMargin,
      freeMargin: this.freeMargin,
      floatingPnL: this.floatingPnL,
      currency: this.currency,
    };
  }

  public applyRealizedPnL(pnl: number): void {
    this.balance += pnl;
    this.equity = this.balance + this.floatingPnL;
    this.freeMargin = Math.max(0, this.equity - this.usedMargin);
  }

  public recalculateEquity(openPositions: PositionData[]): PaperAccountState {
    let totalFloatingPnl = 0;
    let totalUsedMargin = 0;

    for (const pos of openPositions) {
      if (!pos.isOpen) continue;

      const markPrice = pos.markPrice ?? pos.entryPrice;
      totalFloatingPnl += UnrealizedPnL.calculateSingle(pos, markPrice);

      const margin = (pos.entryPrice * pos.quantity) / (pos.leverage || 1);

      totalUsedMargin += margin;
    }

    this.floatingPnL = totalFloatingPnl;
    this.usedMargin = totalUsedMargin;
    this.equity = this.balance + this.floatingPnL;
    this.freeMargin = Math.max(0, this.equity - this.usedMargin);

    return this.getAccountState();
  }

  public canAffordMargin(marginRequired: number): boolean {
    return this.freeMargin >= marginRequired;
  }

  public deposit(amount: number): number {
    if (amount <= 0) {
      throw new Error('[AccountManager] Deposit amount must be positive.');
    }
    this.balance += amount;
    this.equity = this.balance + this.floatingPnL;
    this.freeMargin = Math.max(0, this.equity - this.usedMargin);
    return this.balance;
  }

  public withdraw(amount: number): number {
    if (amount <= 0) {
      throw new Error('[AccountManager] Withdrawal amount must be positive.');
    }
    if (amount > this.freeMargin) {
      throw new Error('[AccountManager] Insufficient free margin for withdrawal.');
    }
    this.balance -= amount;
    this.equity = this.balance + this.floatingPnL;
    this.freeMargin = Math.max(0, this.equity - this.usedMargin);
    return this.balance;
  }
}
