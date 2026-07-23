import { OrderData, PositionData } from '@tradeflow/trading-domain';
import { PaperAccountState, PaperOrderParams, PaperTradingEngine } from '@tradeflow/paper-trading';
import { OrderRequest } from '../types/index.ts';

export interface ExecutionTarget {
  id: string;
  name: string;
  executeOrder(request: OrderRequest): Promise<OrderData> | OrderData;
  cancelOrder(orderId: string, reason?: string): Promise<OrderData | boolean> | OrderData | boolean;
  getAccountState(): PaperAccountState;
  getOpenPositions(): PositionData[];
  getPosition(symbol: string): PositionData | undefined;
}

export class PaperTradingTarget implements ExecutionTarget {
  public id: string;
  public name: string;
  private paperEngine: PaperTradingEngine;

  constructor(
    paperEngine: PaperTradingEngine,
    id: string = 'paper-default',
    name: string = 'Paper Trading Target'
  ) {
    this.paperEngine = paperEngine;
    this.id = id;
    this.name = name;
  }

  public getPaperEngine(): PaperTradingEngine {
    return this.paperEngine;
  }

  public executeOrder(request: OrderRequest): OrderData {
    const params: PaperOrderParams = {
      symbol: request.symbol,
      side: request.side,
      type: request.type,
      quantity: request.quantity,
      price: request.price,
      stopPrice: request.stopPrice,
      timeInForce: request.timeInForce,
      clientOrderId: request.clientOrderId,
    };
    return this.paperEngine.placeOrder(params);
  }

  public cancelOrder(orderId: string, reason?: string): OrderData {
    return this.paperEngine.cancelOrder(orderId, reason);
  }

  public getAccountState(): PaperAccountState {
    return this.paperEngine.getAccountState();
  }

  public getOpenPositions(): PositionData[] {
    return this.paperEngine.getOpenPositions();
  }

  public getPosition(symbol: string): PositionData | undefined {
    return this.paperEngine.getPosition(symbol);
  }
}
