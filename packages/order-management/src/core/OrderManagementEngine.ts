import { OrderData, OrderSide, OrderStatus, OrderType, PositionSide } from '@tradeflow/trading-domain';
import { RiskEngine } from '@tradeflow/risk-engine';
import { PaperOrderParams } from '@tradeflow/paper-trading';
import { OrderEventEmitter, OrderEventListener, OrderEventType } from '../events/OrderEvents.ts';
import { OrderLifecycle } from '../lifecycle/OrderLifecycle.ts';
import { OrderStateMachine } from '../lifecycle/OrderStateMachine.ts';
import { OrderManager } from '../manager/OrderManager.ts';
import { ExecutionTarget } from '../routing/ExecutionTarget.ts';
import { OrderRouter } from '../routing/OrderRouter.ts';
import {
  ClosePositionParams,
  OMSOrderRecord,
  OMSOrderState,
  OMSOperationResult,
  OrderModificationRequest,
  OrderRequest,
  PartialCloseParams,
  ReversePositionParams,
} from '../types/index.ts';
import { OrderRequestValidator } from '../validation/OrderRequestValidator.ts';

export class OrderManagementEngine {
  private orderManager: OrderManager = new OrderManager();
  private orderRouter: OrderRouter;
  private riskEngine: RiskEngine;
  private lifecycle: OrderLifecycle = new OrderLifecycle();
  private validator: OrderRequestValidator = new OrderRequestValidator();
  private emitter: OrderEventEmitter = new OrderEventEmitter();

  constructor(riskEngine?: RiskEngine, orderRouter?: OrderRouter) {
    this.riskEngine = riskEngine || new RiskEngine();
    this.orderRouter = orderRouter || new OrderRouter();
  }

  public getRiskEngine(): RiskEngine {
    return this.riskEngine;
  }

  public getOrderRouter(): OrderRouter {
    return this.orderRouter;
  }

  public getOrderManager(): OrderManager {
    return this.orderManager;
  }

  public registerExecutionTarget(target: ExecutionTarget): void {
    this.orderRouter.registerTarget(target);
  }

  /**
   * Places an order through full OMS workflow
   */
  public placeOrder(request: OrderRequest): OMSOperationResult {
    // 1. Create order record in NEW state
    const record = this.lifecycle.createOrderRecord(request);
    this.orderManager.saveOrder(record);
    this.emitter.emit('oms.order.created', { orderRecord: record });

    // 2. Transition to PENDING
    this.lifecycle.transitionState(record, OMSOrderState.PENDING);
    this.orderManager.saveOrder(record);

    // 3. Request validation
    const validationRes = this.validator.validate(request);
    this.emitter.emit('oms.order.validated', {
      orderRecord: record,
      approved: validationRes.approved,
      reasons: validationRes.reasons,
    });

    if (!validationRes.approved) {
      this.lifecycle.transitionState(record, OMSOrderState.REJECTED, validationRes.reasons);
      this.orderManager.saveOrder(record);
      this.emitter.emit('oms.order.rejected', {
        orderRecord: record,
        reasons: validationRes.reasons,
      });

      return {
        success: false,
        orderId: record.id,
        clientOrderId: record.clientOrderId,
        state: OMSOrderState.REJECTED,
        reasons: validationRes.reasons,
        orderRecord: record,
      };
    }

    // 4. Resolve Execution Target
    let target: ExecutionTarget;
    try {
      target = this.orderRouter.getTarget(request.targetId);
      record.routedTargetId = target.id;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Execution target resolution failed.';
      this.lifecycle.transitionState(record, OMSOrderState.REJECTED, [reason]);
      this.orderManager.saveOrder(record);
      this.emitter.emit('oms.order.rejected', {
        orderRecord: record,
        reasons: [reason],
      });

      return {
        success: false,
        orderId: record.id,
        clientOrderId: record.clientOrderId,
        state: OMSOrderState.REJECTED,
        reasons: [reason],
        orderRecord: record,
      };
    }

    // 5. Risk Engine Validation
    const accountState = target.getAccountState();
    const openPositions = target.getOpenPositions();

    const paperOrderParams: PaperOrderParams = {
      symbol: request.symbol,
      side: request.side,
      type: request.type,
      quantity: request.quantity,
      price: request.price,
      stopPrice: request.stopPrice,
      timeInForce: request.timeInForce,
      clientOrderId: request.clientOrderId,
    };

    const riskRes = this.riskEngine.validateOrder(
      paperOrderParams,
      accountState,
      openPositions,
      accountState.balance,
      request.leverage || 1
    );

    if (!riskRes.approved) {
      this.lifecycle.transitionState(record, OMSOrderState.REJECTED, riskRes.reasons);
      this.orderManager.saveOrder(record);
      this.emitter.emit('oms.order.rejected', {
        orderRecord: record,
        reasons: riskRes.reasons,
      });

      return {
        success: false,
        orderId: record.id,
        clientOrderId: record.clientOrderId,
        state: OMSOrderState.REJECTED,
        reasons: riskRes.reasons,
        orderRecord: record,
      };
    }

    // 6. Risk Approved
    this.lifecycle.transitionState(record, OMSOrderState.APPROVED);
    this.orderManager.saveOrder(record);
    this.emitter.emit('oms.order.approved', { orderRecord: record });

    // 7. Route Order
    this.lifecycle.transitionState(record, OMSOrderState.ROUTED);
    this.orderManager.saveOrder(record);
    this.emitter.emit('oms.order.routed', { orderRecord: record, targetId: target.id });

    // 8. Execute on Target
    try {
      const execResult = target.executeOrder(request) as OrderData;
      record.executionResult = execResult;

      let finalState = OMSOrderState.FILLED;
      if (execResult.status === OrderStatus.REJECTED) {
        finalState = OMSOrderState.REJECTED;
      } else if (execResult.status === OrderStatus.CANCELLED) {
        finalState = OMSOrderState.CANCELLED;
      } else if (execResult.status === OrderStatus.PARTIALLY_FILLED) {
        finalState = OMSOrderState.PARTIALLY_FILLED;
      } else if (execResult.status === OrderStatus.EXPIRED) {
        finalState = OMSOrderState.EXPIRED;
      } else if (execResult.status === OrderStatus.PENDING) {
        // Limits or stops resting in order book are routed/pending
        finalState = OMSOrderState.ROUTED;
      }

      if (finalState !== OMSOrderState.ROUTED) {
        this.lifecycle.transitionState(record, finalState);
      }
      this.orderManager.saveOrder(record);

      if (finalState === OMSOrderState.FILLED || finalState === OMSOrderState.PARTIALLY_FILLED || finalState === OMSOrderState.ROUTED) {
        this.emitter.emit('oms.order.filled', { orderRecord: record, executionResult: execResult });
      }

      return {
        success: true,
        orderId: record.id,
        clientOrderId: record.clientOrderId,
        state: record.state,
        executionResult: execResult,
        orderRecord: record,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Execution failed';
      this.lifecycle.transitionState(record, OMSOrderState.FAILED, [errorMsg]);
      this.orderManager.saveOrder(record);

      return {
        success: false,
        orderId: record.id,
        clientOrderId: record.clientOrderId,
        state: OMSOrderState.FAILED,
        reasons: [errorMsg],
        orderRecord: record,
      };
    }
  }

  /**
   * Cancels a pending or active order
   */
  public cancelOrder(orderId: string, reason?: string): OMSOperationResult {
    const record = this.orderManager.getOrder(orderId) || this.orderManager.getOrderByClientOrderId(orderId);

    if (!record) {
      return {
        success: false,
        reasons: [`Order '${orderId}' not found in OMS.`],
      };
    }

    if (!OrderStateMachine.isCancellableState(record.state)) {
      return {
        success: false,
        orderId: record.id,
        state: record.state,
        reasons: [`Order in state '${record.state}' cannot be cancelled.`],
      };
    }

    try {
      if (record.routedTargetId) {
        const target = this.orderRouter.getTarget(record.routedTargetId);
        const targetOrderId = record.executionResult?.id || record.id;
        target.cancelOrder(targetOrderId, reason);
      }

      this.lifecycle.transitionState(record, OMSOrderState.CANCELLED, reason ? [reason] : undefined);
      this.orderManager.saveOrder(record);
      this.emitter.emit('oms.order.cancelled', { orderRecord: record, reason });

      return {
        success: true,
        orderId: record.id,
        state: OMSOrderState.CANCELLED,
        orderRecord: record,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Cancellation failed';
      return {
        success: false,
        orderId: record.id,
        state: record.state,
        reasons: [errorMsg],
      };
    }
  }

  /**
   * Modifies an active order by cancelling existing order and placing new request
   */
  public modifyOrder(request: OrderModificationRequest): OMSOperationResult {
    const record = this.orderManager.getOrder(request.orderId);
    if (!record) {
      return {
        success: false,
        reasons: [`Order '${request.orderId}' not found for modification.`],
      };
    }

    if (!OrderStateMachine.isCancellableState(record.state)) {
      return {
        success: false,
        reasons: [`Order '${request.orderId}' in state '${record.state}' cannot be modified.`],
      };
    }

    const previousRequest = { ...record.request };
    const modifiedRequest: OrderRequest = {
      ...record.request,
      quantity: request.newQuantity ?? record.request.quantity,
      price: request.newPrice ?? record.request.price,
      stopPrice: request.newStopPrice ?? record.request.stopPrice,
    };

    // Cancel old order
    const cancelRes = this.cancelOrder(record.id, 'Order modified by OMS');
    if (!cancelRes.success) {
      return cancelRes;
    }

    // Place new order
    const newOrderRes = this.placeOrder(modifiedRequest);
    if (newOrderRes.success && newOrderRes.orderRecord) {
      this.emitter.emit('oms.order.modified', {
        orderRecord: newOrderRes.orderRecord,
        previousRequest,
      });
    }

    return newOrderRes;
  }

  /**
   * Closes an open position
   */
  public closePosition(params: ClosePositionParams): OMSOperationResult {
    const target = this.orderRouter.getTarget(params.targetId);
    const position = target.getPosition(params.symbol);

    if (!position || !position.isOpen || position.quantity <= 0) {
      return {
        success: false,
        reasons: [`No open position found for symbol '${params.symbol}'.`],
      };
    }

    const closeQty = params.quantity ?? position.quantity;
    if (closeQty > position.quantity) {
      return {
        success: false,
        reasons: [
          `Requested close quantity (${closeQty}) exceeds position quantity (${position.quantity}).`,
        ],
      };
    }

    const closeSide = position.side === PositionSide.LONG ? OrderSide.SELL : OrderSide.BUY;

    const closeRequest: OrderRequest = {
      symbol: params.symbol,
      side: closeSide,
      type: OrderType.MARKET,
      quantity: closeQty,
      targetId: target.id,
    };

    const placeRes = this.placeOrder(closeRequest);

    if (placeRes.success) {
      this.emitter.emit('oms.position.closed', {
        symbol: params.symbol,
        closedQuantity: closeQty,
        executionResult: placeRes.executionResult,
      });
    }

    return placeRes;
  }

  /**
   * Partially closes an open position
   */
  public partialClosePosition(params: PartialCloseParams): OMSOperationResult {
    return this.closePosition({
      symbol: params.symbol,
      quantity: params.closeQuantity,
      targetId: params.targetId,
    });
  }

  /**
   * Reverses an open position
   */
  public reversePosition(params: ReversePositionParams): OMSOperationResult {
    const target = this.orderRouter.getTarget(params.targetId);
    const position = target.getPosition(params.symbol);

    if (!position || !position.isOpen || position.quantity <= 0) {
      return {
        success: false,
        reasons: [`No open position found for symbol '${params.symbol}' to reverse.`],
      };
    }

    const reverseSide = position.side === PositionSide.LONG ? OrderSide.SELL : OrderSide.BUY;
    const reverseQuantity = position.quantity * 2;

    const reverseRequest: OrderRequest = {
      symbol: params.symbol,
      side: reverseSide,
      type: OrderType.MARKET,
      quantity: reverseQuantity,
      targetId: target.id,
    };

    return this.placeOrder(reverseRequest);
  }

  /**
   * Places a batch of order requests
   */
  public batchOrders(requests: OrderRequest[]): OMSOperationResult[] {
    return requests.map((req) => this.placeOrder(req));
  }

  // Event Listeners
  public on<K extends OrderEventType>(
    event: K,
    listener: OrderEventListener<K>
  ): () => void {
    return this.emitter.on(event, listener);
  }

  public off<K extends OrderEventType>(
    event: K,
    listener: OrderEventListener<K>
  ): void {
    this.emitter.off(event, listener);
  }
}
