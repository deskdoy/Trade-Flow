import { MarginMode, PositionSide } from '../enums/index.ts';
import { PositionData } from '../types/index.ts';

export class PositionModel implements PositionData {
  public readonly id: string;
  public readonly symbol: string;
  public readonly side: PositionSide;
  public readonly quantity: number;
  public readonly entryPrice: number;
  public readonly markPrice?: number;
  public readonly unrealizedPnl: number;
  public readonly realizedPnl: number;
  public readonly marginMode: MarginMode;
  public readonly leverage: number;
  public readonly liquidationPrice?: number;
  public readonly openedAt: string;
  public readonly updatedAt: string;
  public readonly closedAt?: string;
  public readonly isOpen: boolean;

  constructor(data: PositionData) {
    this.id = data.id;
    this.symbol = data.symbol;
    this.side = data.side;
    this.quantity = data.quantity;
    this.entryPrice = data.entryPrice;
    this.markPrice = data.markPrice;
    this.unrealizedPnl = data.unrealizedPnl;
    this.realizedPnl = data.realizedPnl;
    this.marginMode = data.marginMode;
    this.leverage = data.leverage;
    this.liquidationPrice = data.liquidationPrice;
    this.openedAt = data.openedAt;
    this.updatedAt = data.updatedAt;
    this.closedAt = data.closedAt;
    this.isOpen = data.isOpen;
  }

  public get notionalValue(): number {
    const currentPrice = this.markPrice ?? this.entryPrice;
    return currentPrice * this.quantity;
  }

  public get marginRequired(): number {
    if (this.leverage <= 0) return this.notionalValue;
    return this.notionalValue / this.leverage;
  }

  public toJSON(): PositionData {
    return {
      id: this.id,
      symbol: this.symbol,
      side: this.side,
      quantity: this.quantity,
      entryPrice: this.entryPrice,
      markPrice: this.markPrice,
      unrealizedPnl: this.unrealizedPnl,
      realizedPnl: this.realizedPnl,
      marginMode: this.marginMode,
      leverage: this.leverage,
      liquidationPrice: this.liquidationPrice,
      openedAt: this.openedAt,
      updatedAt: this.updatedAt,
      closedAt: this.closedAt,
      isOpen: this.isOpen,
    };
  }
}
