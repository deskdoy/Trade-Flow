import { OrderSide, OrderStatus, OrderType, TimeInForce } from '../enums/index.ts';
import { OrderData } from '../types/index.ts';

export class OrderModel implements OrderData {
  public readonly id: string;
  public readonly clientOrderId?: string;
  public readonly symbol: string;
  public readonly side: OrderSide;
  public readonly type: OrderType;
  public readonly status: OrderStatus;
  public readonly quantity: number;
  public readonly filledQuantity: number;
  public readonly price?: number;
  public readonly stopPrice?: number;
  public readonly timeInForce: TimeInForce;
  public readonly createdAt: string;
  public readonly updatedAt: string;
  public readonly avgExecutionPrice?: number;
  public readonly tradeIds?: string[];

  constructor(data: OrderData) {
    this.id = data.id;
    this.clientOrderId = data.clientOrderId;
    this.symbol = data.symbol;
    this.side = data.side;
    this.type = data.type;
    this.status = data.status;
    this.quantity = data.quantity;
    this.filledQuantity = data.filledQuantity;
    this.price = data.price;
    this.stopPrice = data.stopPrice;
    this.timeInForce = data.timeInForce;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.avgExecutionPrice = data.avgExecutionPrice;
    this.tradeIds = data.tradeIds ? [...data.tradeIds] : [];
  }

  public get remainingQuantity(): number {
    return Math.max(0, this.quantity - this.filledQuantity);
  }

  public get isFilled(): boolean {
    return this.filledQuantity >= this.quantity;
  }

  public toJSON(): OrderData {
    return {
      id: this.id,
      clientOrderId: this.clientOrderId,
      symbol: this.symbol,
      side: this.side,
      type: this.type,
      status: this.status,
      quantity: this.quantity,
      filledQuantity: this.filledQuantity,
      price: this.price,
      stopPrice: this.stopPrice,
      timeInForce: this.timeInForce,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      avgExecutionPrice: this.avgExecutionPrice,
      tradeIds: this.tradeIds ? [...this.tradeIds] : [],
    };
  }
}
