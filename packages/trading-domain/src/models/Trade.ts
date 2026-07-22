import { OrderSide } from '../enums/index.ts';
import { TradeData } from '../types/index.ts';

export class TradeModel implements TradeData {
  public readonly id: string;
  public readonly orderId: string;
  public readonly symbol: string;
  public readonly side: OrderSide;
  public readonly price: number;
  public readonly quantity: number;
  public readonly fee: number;
  public readonly feeAsset: string;
  public readonly timestamp: string;

  constructor(data: TradeData) {
    this.id = data.id;
    this.orderId = data.orderId;
    this.symbol = data.symbol;
    this.side = data.side;
    this.price = data.price;
    this.quantity = data.quantity;
    this.fee = data.fee;
    this.feeAsset = data.feeAsset;
    this.timestamp = data.timestamp;
  }

  public get notionalValue(): number {
    return this.price * this.quantity;
  }

  public toJSON(): TradeData {
    return {
      id: this.id,
      orderId: this.orderId,
      symbol: this.symbol,
      side: this.side,
      price: this.price,
      quantity: this.quantity,
      fee: this.fee,
      feeAsset: this.feeAsset,
      timestamp: this.timestamp,
    };
  }
}
