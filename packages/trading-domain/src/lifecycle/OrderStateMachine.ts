import { OrderStatus } from '../enums/index.ts';
import { OrderData } from '../types/index.ts';

export class OrderStateMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.NEW]: [
      OrderStatus.PENDING,
      OrderStatus.FILLED,
      OrderStatus.CANCELLED,
      OrderStatus.REJECTED,
    ],
    [OrderStatus.PENDING]: [
      OrderStatus.PARTIALLY_FILLED,
      OrderStatus.FILLED,
      OrderStatus.CANCELLED,
      OrderStatus.REJECTED,
      OrderStatus.EXPIRED,
    ],
    [OrderStatus.PARTIALLY_FILLED]: [
      OrderStatus.PARTIALLY_FILLED,
      OrderStatus.FILLED,
      OrderStatus.CANCELLED,
      OrderStatus.EXPIRED,
    ],
    [OrderStatus.FILLED]: [OrderStatus.CLOSED],
    [OrderStatus.CANCELLED]: [OrderStatus.CLOSED],
    [OrderStatus.REJECTED]: [OrderStatus.CLOSED],
    [OrderStatus.EXPIRED]: [OrderStatus.CLOSED],
    [OrderStatus.CLOSED]: [],
  };

  /**
   * Checks whether transition from current status to next status is valid
   */
  public canTransition(from: OrderStatus, to: OrderStatus): boolean {
    const allowed = OrderStateMachine.ALLOWED_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Returns list of allowed next order statuses
   */
  public getAllowedTransitions(from: OrderStatus): OrderStatus[] {
    return OrderStateMachine.ALLOWED_TRANSITIONS[from] ? [...OrderStateMachine.ALLOWED_TRANSITIONS[from]] : [];
  }

  /**
   * Returns true if status is CLOSED
   */
  public isClosed(status: OrderStatus): boolean {
    return status === OrderStatus.CLOSED;
  }

  /**
   * Returns true if order is in a final non-active state (FILLED, CANCELLED, REJECTED, EXPIRED, CLOSED)
   */
  public isTerminal(status: OrderStatus): boolean {
    return (
      status === OrderStatus.FILLED ||
      status === OrderStatus.CANCELLED ||
      status === OrderStatus.REJECTED ||
      status === OrderStatus.EXPIRED ||
      status === OrderStatus.CLOSED
    );
  }

  /**
   * Enforces transition and returns updated OrderData object or throws error
   */
  public transition(order: OrderData, nextStatus: OrderStatus): OrderData {
    if (!this.canTransition(order.status, nextStatus)) {
      throw new Error(
        `Invalid order state transition from "${order.status}" to "${nextStatus}" for order ID "${order.id}".`
      );
    }

    return {
      ...order,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
  }
}
