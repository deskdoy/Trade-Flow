import { Order, Position, AccountInfo, OrderType, OrderSide } from "@tradeflow/shared";

export interface Broker {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  placeOrder(symbol: string, type: OrderType, side: OrderSide, quantity: number, price?: number): Promise<Order>;
  cancelOrder(orderId: string): Promise<boolean>;
  positions(): Promise<Position[]>;
  account(): Promise<AccountInfo>;
}
