import { OrderStatus } from '@tradeflow/trading-domain';
import { PaperOrderParams, PaperTradingEngine } from '@tradeflow/paper-trading';
import { ExecutionAcknowledgement } from '../acknowledgement/ExecutionAcknowledgement.ts';
import { ExecutionLifecycle } from '../lifecycle/ExecutionLifecycle.ts';
import {
  ExecutionAcknowledgementData,
  ExecutionRequest,
  ExecutionResult,
  ExecutionStatus,
  ExecutionTargetType,
} from '../types/index.ts';
import { ExecutionTarget } from './ExecutionTarget.ts';

export class PaperTradingTarget implements ExecutionTarget {
  public readonly id: string;
  public readonly name: string;
  public readonly type: ExecutionTargetType = 'paper';
  private paperEngine: PaperTradingEngine;
  private lifecycle: ExecutionLifecycle = new ExecutionLifecycle();

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

  public isAvailable(): boolean {
    return true;
  }

  public acknowledge(request: ExecutionRequest): ExecutionAcknowledgementData {
    return ExecutionAcknowledgement.accept(request, this.id, 'Paper trading target acknowledged execution request');
  }

  public execute(request: ExecutionRequest): ExecutionResult {
    const startTimeMs = Date.now();
    const ack = this.acknowledge(request);

    try {
      const req = request.orderRequest;
      const paperParams: PaperOrderParams = {
        symbol: req.symbol,
        side: req.side,
        type: req.type,
        quantity: req.quantity,
        price: req.price,
        stopPrice: req.stopPrice,
        timeInForce: req.timeInForce,
        clientOrderId: req.clientOrderId,
      };

      const orderData = this.paperEngine.placeOrder(paperParams);

      let status = ExecutionStatus.COMPLETED;
      if (orderData.status === OrderStatus.REJECTED) {
        status = ExecutionStatus.FAILED;
      }

      return this.lifecycle.createResult(
        request,
        this.id,
        status,
        ack,
        startTimeMs,
        orderData
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Paper execution error';
      const failAck = ExecutionAcknowledgement.fail(request, this.id, errorMsg);
      return this.lifecycle.createResult(
        request,
        this.id,
        ExecutionStatus.FAILED,
        failAck,
        startTimeMs,
        undefined,
        errorMsg
      );
    }
  }

  public cancel(_requestId: string, orderId?: string, reason?: string): boolean {
    if (!orderId) return false;
    try {
      this.paperEngine.cancelOrder(orderId, reason);
      return true;
    } catch {
      return false;
    }
  }
}
