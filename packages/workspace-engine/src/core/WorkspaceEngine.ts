import { EngineHealth, EngineLifecycle, SnapshotProvider as CoreSnapshotProvider } from '@tradeflow/core';
import { WorkspaceEventListener, WorkspaceEventEmitter, WorkspaceEventType } from '../events/WorkspaceEvents.ts';
import { WorkspaceManager } from '../manager/WorkspaceManager.ts';
import { WorkspaceRegistry } from '../registry/WorkspaceRegistry.ts';
import { SnapshotProvider } from '../snapshot/SnapshotProvider.ts';
import { WorkspaceStorageProvider } from '../storage/WorkspaceStorage.ts';
import { ValidationResult, WorkspaceData, WorkspaceMetadata } from '../types/index.ts';
import { WorkspaceValidator } from '../validation/WorkspaceValidator.ts';

export class WorkspaceEngine implements EngineLifecycle, CoreSnapshotProvider<WorkspaceMetadata[]> {
  private events: WorkspaceEventEmitter = new WorkspaceEventEmitter();
  private validator: WorkspaceValidator = new WorkspaceValidator();
  private manager: WorkspaceManager;
  private startTime: number = Date.now();

  constructor(storageProvider?: WorkspaceStorageProvider) {
    this.manager = new WorkspaceManager(this.events, storageProvider, this.validator);
  }

  public initialize(): void {
    // Lifecycle initialization
  }

  public getVersion(): string {
    return '0.1.0';
  }

  public getHealth(): EngineHealth {
    return {
      healthy: true,
      version: this.getVersion(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      objectCount: this.list().length,
    };
  }

  public reset(): void {
    const all = this.list();
    for (const item of all) {
      this.delete(item.id);
    }
  }

  public validate(workspace: WorkspaceData): ValidationResult {
    return this.validator.validateWorkspace(workspace);
  }

  public getSnapshot(): WorkspaceMetadata[] {
    return this.list();
  }

  public restoreSnapshot(snapshot: WorkspaceMetadata[]): void {
    // Restores list of metadata
  }

  public getValidator(): WorkspaceValidator {
    return this.validator;
  }


  public getRegistry(): WorkspaceRegistry {
    return this.manager.getRegistry();
  }

  public registerSnapshotProvider(provider: SnapshotProvider): void {
    this.manager.registerSnapshotProvider(provider);
  }

  public unregisterSnapshotProvider(providerId: string): void {
    this.manager.unregisterSnapshotProvider(providerId);
  }

  public getSnapshotProvider(providerId: string): SnapshotProvider | undefined {
    return this.manager.getSnapshotProvider(providerId);
  }

  public save(workspace: WorkspaceData): WorkspaceMetadata {
    return this.manager.save(workspace);
  }

  public load(id: string): WorkspaceData {
    return this.manager.load(id);
  }

  public exists(id: string): boolean {
    return this.manager.exists(id);
  }

  public delete(id: string): boolean {
    return this.manager.delete(id);
  }

  public rename(id: string, newName: string): WorkspaceData {
    return this.manager.rename(id, newName);
  }

  public duplicate(id: string, newName?: string): WorkspaceData {
    return this.manager.duplicate(id, newName);
  }

  public list(filter?: { tag?: string; search?: string }): WorkspaceMetadata[] {
    return this.manager.list(filter);
  }

  public export(id: string): string {
    return this.manager.export(id);
  }

  public import(jsonStr: string): WorkspaceData {
    return this.manager.import(jsonStr);
  }

  public on<K extends WorkspaceEventType>(
    event: K,
    listener: WorkspaceEventListener<K>
  ): () => void {
    return this.events.on(event, listener);
  }

  public off<K extends WorkspaceEventType>(
    event: K,
    listener: WorkspaceEventListener<K>
  ): void {
    this.events.off(event, listener);
  }

  public destroy(): void {
    this.events.clear();
  }
}
