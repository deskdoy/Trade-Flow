import { EventBus } from '@tradeflow/core';
import { ValidationResult, WorkspaceData, WorkspaceMetadata } from '../types/index.ts';

export type WorkspaceEventType =
  | 'workspace.saved'
  | 'workspace.loaded'
  | 'workspace.deleted'
  | 'workspace.created'
  | 'workspace.imported'
  | 'workspace.exported'
  | 'workspace.renamed'
  | 'workspace.validation.failed';

export interface WorkspaceEventPayloadMap {
  'workspace.saved': { workspace: WorkspaceData };
  'workspace.loaded': { workspace: WorkspaceData };
  'workspace.deleted': { id: string };
  'workspace.created': { workspace: WorkspaceData };
  'workspace.imported': { workspace: WorkspaceData };
  'workspace.exported': { id: string; json: string };
  'workspace.renamed': { id: string; oldName: string; newName: string };
  'workspace.validation.failed': { id?: string; result: ValidationResult };
}

export type WorkspaceEventListener<T extends WorkspaceEventType> = (
  payload: WorkspaceEventPayloadMap[T]
) => void;

export class WorkspaceEventEmitter {
  private bus: EventBus = new EventBus();

  public on<K extends WorkspaceEventType>(
    event: K,
    listener: WorkspaceEventListener<K>
  ): () => void {
    return this.bus.on(event, listener);
  }

  public off<K extends WorkspaceEventType>(
    event: K,
    listener: WorkspaceEventListener<K>
  ): void {
    this.bus.off(event, listener);
  }

  public emit<K extends WorkspaceEventType>(
    event: K,
    payload: WorkspaceEventPayloadMap[K]
  ): void {
    this.bus.emit(event, payload);
  }

  public clear(): void {
    this.bus.clear();
  }
}
