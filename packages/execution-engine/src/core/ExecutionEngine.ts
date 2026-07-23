import { ExecutionAcknowledgement } from '../acknowledgement/ExecutionAcknowledgement.ts';
import { ExecutionEventEmitter, ExecutionEventListener, ExecutionEventType } from '../events/ExecutionEvents.ts';
import { ExecutionLifecycle } from '../lifecycle/ExecutionLifecycle.ts';
import { ExecutionQueue } from '../queue/ExecutionQueue.ts';
import { ExecutionRouter } from '../router/ExecutionRouter.ts';
import { ExecutionTarget } from '../targets/ExecutionTarget.ts';
import {
  ExecutionAcknowledgementData,
  ExecutionOrderRequest,
  ExecutionRequest,
  ExecutionResult,
  ExecutionStatus,
  ExecutionTargetType,
} from '../types/index.ts';

export class ExecutionEngine {
  private router: ExecutionRouter;
  private queue: ExecutionQueue = new ExecutionQueue();
  private lifecycle: ExecutionLifecycle = new ExecutionLifecycle();
  private emitter: ExecutionEventEmitter = new ExecutionEventEmitter();

  constructor(router?: ExecutionRouter) {
    this.router = router || new ExecutionRouter();
  }

  public getRouter(): ExecutionRouter {
    return this.router;
  }

  public getQueue(): ExecutionQueue {
    return this.queue;
  }

  public registerTarget(target: ExecutionTarget): void {
    this.router.registerTarget(target);
  }

  /**
   * Primary entry point for order execution requests
   */
  public async execute(
    orderRequest: ExecutionOrderRequest,
    options?: { targetId?: string; targetType?: ExecutionTargetType; [key: string]: unknown }
  ): Promise<ExecutionResult> {
    const startTimeMs = Date.now();

    // 1. Create Execution Request
    const request = this.lifecycle.createRequest(
      orderRequest,
      options?.targetId || orderRequest.targetId,
      options?.targetType || orderRequest.targetType,
      options
    );

    this.emitter.emit('execution.requested', { request });

    // 2. Enqueue Request
    this.queue.enqueue(request);

    // 3. Select Execution Target
    let target: ExecutionTarget;
    try {
      target = this.router.selectTarget(request);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'No execution target available.';
      this.queue.updateStatus(request.requestId, ExecutionStatus.FAILED, errorMsg);

      const failAck = ExecutionAcknowledgement.fail(request, 'unknown', errorMsg);
      const result = this.lifecycle.createResult(
        request,
        'unknown',
        ExecutionStatus.FAILED,
        failAck,
        startTimeMs,
        undefined,
        errorMsg
      );

      this.emitter.emit('execution.failed', { request, error: errorMsg, result });
      return result;
    }

    // 4. Update Queue Status to STARTED
    this.queue.updateStatus(request.requestId, ExecutionStatus.STARTED);
    this.emitter.emit('execution.started', { request, targetId: target.id });

    // 5. Send to Target
    this.queue.updateStatus(request.requestId, ExecutionStatus.EXECUTING);
    this.emitter.emit('execution.sent', { request, targetId: target.id });

    // 6. Obtain Acknowledgement
    let ack: ExecutionAcknowledgementData;
    try {
      ack = await target.acknowledge(request);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Target acknowledgement failed.';
      ack = ExecutionAcknowledgement.fail(request, target.id, errorMsg);
    }

    this.emitter.emit('execution.acknowledged', { request, acknowledgement: ack });

    if (ack.status === 'REJECTED' || ack.status === 'FAILED') {
      const errorMsg = ack.message || 'Target rejected execution request.';
      this.queue.updateStatus(request.requestId, ExecutionStatus.FAILED, errorMsg);

      const result = this.lifecycle.createResult(
        request,
        target.id,
        ExecutionStatus.FAILED,
        ack,
        startTimeMs,
        undefined,
        errorMsg
      );

      this.emitter.emit('execution.failed', { request, error: errorMsg, result });
      return result;
    }

    // 7. Perform Target Execution
    try {
      const result = await target.execute(request);
      this.queue.updateStatus(request.requestId, result.status);

      if (result.status === ExecutionStatus.COMPLETED) {
        this.emitter.emit('execution.completed', { request, result });
      } else {
        this.emitter.emit('execution.failed', {
          request,
          error: result.error || 'Execution incomplete',
          result,
        });
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Execution failed on target';
      this.queue.updateStatus(request.requestId, ExecutionStatus.FAILED, errorMsg);

      const failAck = ExecutionAcknowledgement.fail(request, target.id, errorMsg);
      const result = this.lifecycle.createResult(
        request,
        target.id,
        ExecutionStatus.FAILED,
        failAck,
        startTimeMs,
        undefined,
        errorMsg
      );

      this.emitter.emit('execution.failed', { request, error: errorMsg, result });
      return result;
    }
  }

  /**
   * Synchronous entry point for synchronous execution targets
   */
  public executeSync(
    orderRequest: ExecutionOrderRequest,
    options?: { targetId?: string; targetType?: ExecutionTargetType; [key: string]: unknown }
  ): ExecutionResult {
    const startTimeMs = Date.now();

    const request = this.lifecycle.createRequest(
      orderRequest,
      options?.targetId || orderRequest.targetId,
      options?.targetType || orderRequest.targetType,
      options
    );

    this.emitter.emit('execution.requested', { request });
    this.queue.enqueue(request);

    let target: ExecutionTarget;
    try {
      target = this.router.selectTarget(request);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'No execution target available.';
      this.queue.updateStatus(request.requestId, ExecutionStatus.FAILED, errorMsg);

      const failAck = ExecutionAcknowledgement.fail(request, 'unknown', errorMsg);
      const result = this.lifecycle.createResult(
        request,
        'unknown',
        ExecutionStatus.FAILED,
        failAck,
        startTimeMs,
        undefined,
        errorMsg
      );

      this.emitter.emit('execution.failed', { request, error: errorMsg, result });
      return result;
    }

    this.queue.updateStatus(request.requestId, ExecutionStatus.STARTED);
    this.emitter.emit('execution.started', { request, targetId: target.id });

    this.queue.updateStatus(request.requestId, ExecutionStatus.EXECUTING);
    this.emitter.emit('execution.sent', { request, targetId: target.id });

    let ack: ExecutionAcknowledgementData;
    try {
      const ackRes = target.acknowledge(request);
      ack = ackRes instanceof Promise ? ExecutionAcknowledgement.accept(request, target.id) : ackRes;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Target acknowledgement failed.';
      ack = ExecutionAcknowledgement.fail(request, target.id, errorMsg);
    }

    this.emitter.emit('execution.acknowledged', { request, acknowledgement: ack });

    if (ack.status === 'REJECTED' || ack.status === 'FAILED') {
      const errorMsg = ack.message || 'Target rejected execution request.';
      this.queue.updateStatus(request.requestId, ExecutionStatus.FAILED, errorMsg);

      const result = this.lifecycle.createResult(
        request,
        target.id,
        ExecutionStatus.FAILED,
        ack,
        startTimeMs,
        undefined,
        errorMsg
      );

      this.emitter.emit('execution.failed', { request, error: errorMsg, result });
      return result;
    }

    try {
      const execRes = target.execute(request);
      const result = execRes instanceof Promise ? this.lifecycle.createResult(request, target.id, ExecutionStatus.COMPLETED, ack, startTimeMs) : execRes;
      this.queue.updateStatus(request.requestId, result.status);

      if (result.status === ExecutionStatus.COMPLETED) {
        this.emitter.emit('execution.completed', { request, result });
      } else {
        this.emitter.emit('execution.failed', {
          request,
          error: result.error || 'Execution incomplete',
          result,
        });
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Execution failed on target';
      this.queue.updateStatus(request.requestId, ExecutionStatus.FAILED, errorMsg);

      const failAck = ExecutionAcknowledgement.fail(request, target.id, errorMsg);
      const result = this.lifecycle.createResult(
        request,
        target.id,
        ExecutionStatus.FAILED,
        failAck,
        startTimeMs,
        undefined,
        errorMsg
      );

      this.emitter.emit('execution.failed', { request, error: errorMsg, result });
      return result;
    }
  }

  /**
   * Cancels an in-flight or queued execution request
   */
  public async cancel(requestId: string, orderId?: string, reason?: string): Promise<boolean> {
    const queueItem = this.queue.getItem(requestId);
    if (!queueItem) {
      return false;
    }

    let target: ExecutionTarget | undefined;
    if (queueItem.request.targetId) {
      try {
        target = this.router.getTarget(queueItem.request.targetId);
      } catch {
        // target not found or unregistered
      }
    }

    let success = true;
    if (target) {
      success = await target.cancel(requestId, orderId, reason);
    }

    if (success) {
      this.queue.updateStatus(requestId, ExecutionStatus.CANCELLED);
      this.emitter.emit('execution.cancelled', { request: queueItem.request, reason });
    }

    return success;
  }

  // Event Handlers
  public on<K extends ExecutionEventType>(
    event: K,
    listener: ExecutionEventListener<K>
  ): () => void {
    return this.emitter.on(event, listener);
  }

  public off<K extends ExecutionEventType>(
    event: K,
    listener: ExecutionEventListener<K>
  ): void {
    this.emitter.off(event, listener);
  }
}
