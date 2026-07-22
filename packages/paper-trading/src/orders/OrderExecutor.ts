import { OrderData, OrderStatus, OrderStateMachine, TradeData } from '@tradeflow/trading-domain';
import { OrderExecutionResult } from '../types/index.ts';

export class OrderExecutor {
  private stateMachine: OrderStateMachine = new OrderStateMachine();

  /**
   * Executes an order fill at specified fill price
   */
  public executeFill(order: OrderData, fillPrice: number): OrderExecutionResult {
    const tradeId = `trd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const trade: TradeData = {
      id: tradeId,
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      price: fillPrice,
      quantity: order.quantity,
      fee: 0,
      feeAsset: 'USDT',
      timestamp: now,
    };

    let updatedOrder: OrderData = {
      ...order,
      filledQuantity: order.quantity,
      avgExecutionPrice: fillPrice,
      tradeIds: [...(order.tradeIds || []), tradeId],
      updatedAt: now,
    };

    // Transition status to FILLED if allowed from current status
    if (this.stateMachine.canTransition(updatedOrder.status, OrderStatus.FILLED)) {
      updatedOrder = this.stateMachine.transition(updatedOrder, OrderStatus.FILLED);
    } else if (updatedOrder.status === OrderStatus.NEW) {
      // Step through PENDING first if needed
      updatedOrder = this.stateMachine.transition(updatedOrder, OrderStatus.PENDING);
      updatedOrder = this.stateMachine.transition(updatedOrder, OrderStatus.FILLED);
    }

    // Transition FILLED -> CLOSED
    if (this.stateMachine.canTransition(updatedOrder.status, OrderStatus.CLOSED)) {
      updatedOrder = this.stateMachine.transition(updatedOrder, OrderStatus.CLOSED);
    }

    return {
      filledOrder: updatedOrder,
      trade,
    };
  }
}
