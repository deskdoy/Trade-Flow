import { OrderStateMachine } from '../lifecycle/OrderStateMachine.ts';
import { OMSOrderRecord, OMSOrderState } from '../types/index.ts';

export class OrderManager {
  private ordersById: Map<string, OMSOrderRecord> = new Map();
  private ordersByClientOrderId: Map<string, OMSOrderRecord> = new Map();

  /**
   * Saves or updates an order record
   */
  public saveOrder(record: OMSOrderRecord): void {
    this.ordersById.set(record.id, record);
    if (record.clientOrderId) {
      this.ordersByClientOrderId.set(record.clientOrderId, record);
    }
  }

  /**
   * Fetches an order record by order ID
   */
  public getOrder(id: string): OMSOrderRecord | undefined {
    return this.ordersById.get(id);
  }

  /**
   * Fetches an order record by client order ID
   */
  public getOrderByClientOrderId(clientOrderId: string): OMSOrderRecord | undefined {
    return this.ordersByClientOrderId.get(clientOrderId);
  }

  /**
   * Returns all active (non-terminal) order records
   */
  public getActiveOrders(): OMSOrderRecord[] {
    return Array.from(this.ordersById.values()).filter(
      (order) => !OrderStateMachine.isTerminalState(order.state)
    );
  }

  /**
   * Returns all order records for a specific symbol
   */
  public getOrdersBySymbol(symbol: string): OMSOrderRecord[] {
    return Array.from(this.ordersById.values()).filter(
      (order) => order.request.symbol === symbol
    );
  }

  /**
   * Returns all order records stored in OMS
   */
  public getAllOrders(): OMSOrderRecord[] {
    return Array.from(this.ordersById.values());
  }

  /**
   * Clears internal state
   */
  public clear(): void {
    this.ordersById.clear();
    this.ordersByClientOrderId.clear();
  }
}
