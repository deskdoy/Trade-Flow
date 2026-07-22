import { MarginMode } from '../enums/index.ts';
import { AccountData, BalanceData } from '../types/index.ts';
import { BalanceModel } from './Balance.ts';

export class AccountModel implements AccountData {
  public readonly id: string;
  public readonly accountType: 'SPOT' | 'MARGIN' | 'FUTURES';
  public readonly marginMode: MarginMode;
  public readonly balances: BalanceData[];
  public readonly canTrade: boolean;
  public readonly updatedAt: string;

  constructor(data: AccountData) {
    this.id = data.id;
    this.accountType = data.accountType;
    this.marginMode = data.marginMode;
    this.balances = data.balances.map((b) => new BalanceModel(b).toJSON());
    this.canTrade = data.canTrade;
    this.updatedAt = data.updatedAt;
  }

  public getBalance(asset: string): BalanceModel | undefined {
    const found = this.balances.find((b) => b.asset.toUpperCase() === asset.toUpperCase());
    return found ? new BalanceModel(found) : undefined;
  }

  public updateBalance(balance: BalanceData): AccountModel {
    const updatedBalances = this.balances.filter(
      (b) => b.asset.toUpperCase() !== balance.asset.toUpperCase()
    );
    updatedBalances.push(new BalanceModel(balance).toJSON());

    return new AccountModel({
      ...this.toJSON(),
      balances: updatedBalances,
      updatedAt: new Date().toISOString(),
    });
  }

  public toJSON(): AccountData {
    return {
      id: this.id,
      accountType: this.accountType,
      marginMode: this.marginMode,
      balances: this.balances,
      canTrade: this.canTrade,
      updatedAt: this.updatedAt,
    };
  }
}
