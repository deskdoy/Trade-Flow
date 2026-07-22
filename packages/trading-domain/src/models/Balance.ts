import { BalanceData } from '../types/index.ts';

export class BalanceModel implements BalanceData {
  public readonly asset: string;
  public readonly free: number;
  public readonly locked: number;

  constructor(data: BalanceData) {
    this.asset = data.asset;
    this.free = data.free;
    this.locked = data.locked;
  }

  public get total(): number {
    return this.free + this.locked;
  }

  public toJSON(): BalanceData {
    return {
      asset: this.asset,
      free: this.free,
      locked: this.locked,
      total: this.total,
    };
  }

  public lock(amount: number): BalanceModel {
    if (amount <= 0 || amount > this.free) {
      throw new Error(`Cannot lock ${amount} ${this.asset}: insufficient free balance (${this.free})`);
    }
    return new BalanceModel({
      asset: this.asset,
      free: this.free - amount,
      locked: this.locked + amount,
      total: this.total,
    });
  }

  public unlock(amount: number): BalanceModel {
    if (amount <= 0 || amount > this.locked) {
      throw new Error(`Cannot unlock ${amount} ${this.asset}: insufficient locked balance (${this.locked})`);
    }
    return new BalanceModel({
      asset: this.asset,
      free: this.free + amount,
      locked: this.locked - amount,
      total: this.total,
    });
  }

  public addFree(amount: number): BalanceModel {
    if (amount < 0) {
      throw new Error('Amount to add must be non-negative');
    }
    return new BalanceModel({
      asset: this.asset,
      free: this.free + amount,
      locked: this.locked,
      total: this.total + amount,
    });
  }

  public deductFree(amount: number): BalanceModel {
    if (amount <= 0 || amount > this.free) {
      throw new Error(`Cannot deduct ${amount} ${this.asset}: insufficient free balance (${this.free})`);
    }
    return new BalanceModel({
      asset: this.asset,
      free: this.free - amount,
      locked: this.locked,
      total: this.total - amount,
    });
  }
}
