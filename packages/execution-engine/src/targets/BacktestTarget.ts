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

export class BacktestTarget implements ExecutionTarget {
  public readonly id: string;
  public readonly name: string;
  public readonly type: ExecutionTargetType = 'backtest';
  private lifecycle: ExecutionLifecycle = new ExecutionLifecycle();

  constructor(id: string = 'backtest-default', name: string = 'Backtest Engine Target') {
    this.id = id;
    this.name = name;
  }

  public isAvailable(): boolean {
    return true;
  }

  public acknowledge(request: ExecutionRequest): ExecutionAcknowledgementData {
    return ExecutionAcknowledgement.accept(request, this.id, 'Backtest target acknowledged request');
  }

  public execute(request: ExecutionRequest): ExecutionResult {
    const startTimeMs = Date.now();
    const ack = this.acknowledge(request);

    return this.lifecycle.createResult(
      request,
      this.id,
      ExecutionStatus.COMPLETED,
      ack,
      startTimeMs
    );
  }

  public cancel(_requestId: string, _orderId?: string, _reason?: string): boolean {
    return true;
  }
}
