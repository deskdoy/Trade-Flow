import {
  OrderData,
  OrderStatus,
  OrderStateMachine,
  OrderType,
  OrderValidator,
  TimeInForce,
} from '@tradeflow/trading-domain';
import {
  CandleData,
  OrderExecutionResult,
  PaperOrderParams,
  PriceTick,
} from '../types/index.ts';
import { FillSimulator } from './FillSimulator.ts';
import { OrderExecutor } from './OrderExecutor.ts';

export class OrderManager {
  private orders: Map<string, OrderData> = new Map();
  private validator: OrderValidator = new OrderValidator();
  private fillSimulator: FillSimulator = new FillSimulator();
  private executor: OrderExecutor = new OrderExecutor();
  private stateMachine: OrderStateMachine = new OrderStateMachine();

  /**
   * Places a new paper order
   */
  public placeOrder(params: PaperOrderParams): OrderData {
    const valResult = this.validator.validate(params);
    if (!valResult.valid) {
      const msgs = valResult.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
      throw new Error(`[OrderManager] Order validation failed: ${msgs}`);
    }

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const order: OrderData = {
      id: orderId,
      clientOrderId: params.clientOrderId,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      status: params.type === OrderType.MARKET ? OrderStatus.NEW : OrderStatus.PENDING,
      quantity: params.quantity,
      filledQuantity: 0,
      price: params.price,
      stopPrice: params.stopPrice,
      timeInForce: params.timeInForce ?? TimeInForce.GTC,
      createdAt: now,
      updatedAt: now,
    };

    this.orders.set(orderId, order);
    return order;
  }

  /**
   * Cancels a pending order
   */
  public cancelOrder(orderId: string): OrderData {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`[OrderManager] Order with ID "${orderId}" not found.`);
    }

    if (this.stateMachine.isTerminal(order.status)) {
      throw new Error(`[OrderManager] Cannot cancel order in terminal state "${order.status}".`);
    }

    let updatedOrder = order;
    if (this.stateMachine.canTransition(order.status, OrderStatus.CANCELLED)) {
      updatedOrder = this.stateMachine.transition(order, OrderStatus.CANCELLED);
    }

    if (this.stateMachine.canTransition(updatedOrder.status, OrderStatus.CLOSED)) {
      updatedOrder = this.stateMachine.transition(updatedOrder, OrderStatus.CLOSED);
    }

    this.orders.set(orderId, updatedOrder);
    return updatedOrder;
  }

  /**
   * Evaluates all pending orders for symbol against incoming market data
   */
  public processMarketData(data: CandleData | PriceTick): OrderExecutionResult[] {
    const pendingOrders = Array.from(this.orders.values()).filter(
      (o) => o.symbol === data.symbol && !this.stateMachine.isTerminal(o.status)
    );

    const executions: OrderExecutionResult[] = [];

    for (const order of pendingOrders) {
      const evalResult = this.fillSimulator.evaluate(order, data);
      if (evalResult.canFill && evalResult.fillPrice !== undefined) {
        const result = this.executor.executeFill(order, evalResult.fillPrice);
        this.orders.set(order.id, result.filledOrder);
        executions.push(result);
      }
    }

    return executions;
  }

  public getOrder(orderId: string): OrderData | undefined {
    return this.orders.get(orderId);
  }

  public getPendingOrders(symbol?: string): OrderData[] {
    return Array.from(this.orders.values()).filter((o) => {
      const matchSymbol = symbol ? o.symbol === symbol : true;
      return matchSymbol && !this.stateMachine.isTerminal(o.status);
    });
  }

  public getAllOrders(symbol?: string): OrderData[] {
    return Array.from(this.orders.values()).filter((o) => (symbol ? o.symbol === symbol : true));
  }
}
