import {
  ExecutionAcknowledgementData,
  ExecutionRequest,
  ExecutionResult,
  ExecutionTargetType,
} from '../types/index.ts';

export interface ExecutionTarget {
  readonly id: string;
  readonly name: string;
  readonly type: ExecutionTargetType;

  isAvailable(): boolean;

  acknowledge(
    request: ExecutionRequest
  ): Promise<ExecutionAcknowledgementData> | ExecutionAcknowledgementData;

  execute(request: ExecutionRequest): Promise<ExecutionResult> | ExecutionResult;

  cancel(requestId: string, orderId?: string, reason?: string): Promise<boolean> | boolean;
}
