import { ExecutionRequest, ExecutionStatus } from '../types/index.ts';

export interface ExecutionQueueItem {
  request: ExecutionRequest;
  status: ExecutionStatus;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
  error?: string;
}

export class ExecutionQueue {
  private queue: ExecutionQueueItem[] = [];
  private itemsByRequestId: Map<string, ExecutionQueueItem> = new Map();

  /**
   * Enqueues an execution request
   */
  public enqueue(request: ExecutionRequest): ExecutionQueueItem {
    const item: ExecutionQueueItem = {
      request,
      status: ExecutionStatus.QUEUED,
      queuedAt: new Date().toISOString(),
      retryCount: 0,
    };

    this.queue.push(item);
    this.itemsByRequestId.set(request.requestId, item);
    return item;
  }

  /**
   * Dequeues the next item in queue
   */
  public dequeue(): ExecutionQueueItem | undefined {
    return this.queue.shift();
  }

  /**
   * Peeks at the next item without removing
   */
  public peek(): ExecutionQueueItem | undefined {
    return this.queue[0];
  }

  /**
   * Gets queue item by requestId
   */
  public getItem(requestId: string): ExecutionQueueItem | undefined {
    return this.itemsByRequestId.get(requestId);
  }

  /**
   * Updates status of a queue item
   */
  public updateStatus(requestId: string, status: ExecutionStatus, error?: string): ExecutionQueueItem | undefined {
    const item = this.itemsByRequestId.get(requestId);
    if (!item) return undefined;

    item.status = status;
    const now = new Date().toISOString();

    if (status === ExecutionStatus.STARTED || status === ExecutionStatus.EXECUTING) {
      if (!item.startedAt) item.startedAt = now;
    } else if (
      status === ExecutionStatus.COMPLETED ||
      status === ExecutionStatus.FAILED ||
      status === ExecutionStatus.CANCELLED ||
      status === ExecutionStatus.TIMEOUT
    ) {
      item.completedAt = now;
    }

    if (error) {
      item.error = error;
    }

    return item;
  }

  /**
   * Increments retry count for request
   */
  public incrementRetry(requestId: string): number {
    const item = this.itemsByRequestId.get(requestId);
    if (!item) return 0;
    item.retryCount += 1;
    return item.retryCount;
  }

  /**
   * Returns count of queued items waiting to execute
   */
  public getPendingCount(): number {
    return this.queue.filter((i) => i.status === ExecutionStatus.QUEUED).length;
  }

  /**
   * Returns total items tracked in queue memory
   */
  public size(): number {
    return this.itemsByRequestId.size;
  }

  /**
   * Returns all tracked queue items
   */
  public getAllItems(): ExecutionQueueItem[] {
    return Array.from(this.itemsByRequestId.values());
  }

  /**
   * Clears queue state
   */
  public clear(): void {
    this.queue = [];
    this.itemsByRequestId.clear();
  }
}
