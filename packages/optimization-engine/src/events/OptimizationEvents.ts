import { EventBus } from '@tradeflow/core';
import {
  OptimizationProgressData,
  OptimizationResultItem,
  ParameterSet,
} from '../types/index.ts';

export interface OptimizationEventPayloadMap {
  'optimization.started': { mode: string; totalRuns: number };
  'optimization.progress': OptimizationProgressData;
  'optimization.run.started': { runIndex: number; totalRuns: number; parameters: ParameterSet };
  'optimization.run.completed': { runIndex: number; result: OptimizationResultItem };
  'optimization.completed': { totalCompleted: number; bestResult?: OptimizationResultItem };
  'optimization.cancelled': { completedRuns: number; totalRuns: number };
  'optimization.failed': { error: string };
}

export type OptimizationEventType = keyof OptimizationEventPayloadMap;

export type OptimizationEventListener<K extends OptimizationEventType> = (
  payload: OptimizationEventPayloadMap[K]
) => void;

export class OptimizationEventEmitter {
  private eventBus: EventBus = new EventBus();

  public on<K extends OptimizationEventType>(
    event: K,
    listener: OptimizationEventListener<K>
  ): () => void {
    return this.eventBus.on<OptimizationEventPayloadMap[K]>(event, listener);
  }

  public off<K extends OptimizationEventType>(
    event: K,
    listener: OptimizationEventListener<K>
  ): void {
    this.eventBus.off<OptimizationEventPayloadMap[K]>(event, listener);
  }

  public emit<K extends OptimizationEventType>(
    event: K,
    payload: OptimizationEventPayloadMap[K]
  ): void {
    this.eventBus.emit<OptimizationEventPayloadMap[K]>(event, payload);
  }

  public clear(): void {
    this.eventBus.clear();
  }
}
