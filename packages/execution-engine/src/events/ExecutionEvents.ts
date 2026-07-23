import { EventBus } from '@tradeflow/core';
import {
  ExecutionAcknowledgementData,
  ExecutionRequest,
  ExecutionResult,
} from '../types/index.ts';

export interface ExecutionEventPayloadMap {
  'execution.requested': { request: ExecutionRequest };
  'execution.started': { request: ExecutionRequest; targetId: string };
  'execution.sent': { request: ExecutionRequest; targetId: string };
  'execution.acknowledged': {
    request: ExecutionRequest;
    acknowledgement: ExecutionAcknowledgementData;
  };
  'execution.completed': { request: ExecutionRequest; result: ExecutionResult };
  'execution.failed': { request: ExecutionRequest; error: string; result?: ExecutionResult };
  'execution.cancelled': { request: ExecutionRequest; reason?: string };

  'execution.request.started': { request: ExecutionRequest; targetId: string };
  'execution.request.completed': { request: ExecutionRequest; result: ExecutionResult };
  'execution.request.failed': { request: ExecutionRequest; error: string; result?: ExecutionResult };
}

export type ExecutionEventType = keyof ExecutionEventPayloadMap;

export type ExecutionEventListener<K extends ExecutionEventType> = (
  payload: ExecutionEventPayloadMap[K]
) => void;

export class ExecutionEventEmitter {
  private eventBus: EventBus = new EventBus();

  public on<K extends ExecutionEventType>(
    event: K,
    listener: ExecutionEventListener<K>
  ): () => void {
    return this.eventBus.on<ExecutionEventPayloadMap[K]>(event, listener);
  }

  public off<K extends ExecutionEventType>(
    event: K,
    listener: ExecutionEventListener<K>
  ): void {
    this.eventBus.off<ExecutionEventPayloadMap[K]>(event, listener);
  }

  public emit<K extends ExecutionEventType>(
    event: K,
    payload: ExecutionEventPayloadMap[K]
  ): void {
    this.eventBus.emit<ExecutionEventPayloadMap[K]>(event, payload);
  }

  public clear(): void {
    this.eventBus.clear();
  }
}
