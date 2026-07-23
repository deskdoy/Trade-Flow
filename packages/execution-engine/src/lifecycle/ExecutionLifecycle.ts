import {
  ExecutionAcknowledgementData,
  ExecutionOrderRequest,
  ExecutionRequest,
  ExecutionResult,
  ExecutionStatus,
  ExecutionTargetType,
} from '../types/index.ts';

export class ExecutionLifecycle {
  /**
   * Constructs a formatted ExecutionRequest from an ExecutionOrderRequest
   */
  public createRequest(
    orderRequest: ExecutionOrderRequest,
    targetId?: string,
    targetType?: ExecutionTargetType,
    options?: Record<string, unknown>
  ): ExecutionRequest {
    const requestId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      requestId,
      orderRequest,
      targetId: targetId || orderRequest.targetId,
      targetType: targetType || orderRequest.targetType || 'paper',
      timestamp: new Date().toISOString(),
      options,
    };
  }

  /**
   * Constructs an ExecutionResult representing the outcome
   */
  public createResult(
    request: ExecutionRequest,
    targetId: string,
    status: ExecutionStatus,
    acknowledgement: ExecutionAcknowledgementData,
    startTimeMs: number,
    orderData?: ExecutionResult['orderData'],
    error?: string
  ): ExecutionResult {
    const duration = Math.max(0, Date.now() - startTimeMs);
    return {
      requestId: request.requestId,
      orderId: orderData?.id || request.orderRequest.id,
      clientOrderId: orderData?.clientOrderId || request.orderRequest.clientOrderId,
      targetId,
      status,
      acknowledgement,
      orderData,
      error,
      timestamp: new Date().toISOString(),
      executionDurationMs: duration,
    };
  }
}
