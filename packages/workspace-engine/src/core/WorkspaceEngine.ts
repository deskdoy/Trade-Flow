import { WorkspaceEventListener, WorkspaceEventEmitter, WorkspaceEventType } from '../events/WorkspaceEvents.ts';
import { WorkspaceManager } from '../manager/WorkspaceManager.ts';
import { WorkspaceStorageProvider } from '../storage/WorkspaceStorage.ts';
import { WorkspaceData, WorkspaceMetadata } from '../types/index.ts';
import { WorkspaceValidator } from '../validation/WorkspaceValidator.ts';

export class WorkspaceEngine {
  private events: WorkspaceEventEmitter = new WorkspaceEventEmitter();
  private validator: WorkspaceValidator = new WorkspaceValidator();
  private manager: WorkspaceManager;

  constructor(storageProvider?: WorkspaceStorageProvider) {
    this.manager = new WorkspaceManager(this.events, storageProvider, this.validator);
  }

  public getValidator(): WorkspaceValidator {
    return this.validator;
  }

  public save(workspace: WorkspaceData): WorkspaceMetadata {
    return this.manager.save(workspace);
  }

  public load(id: string): WorkspaceData {
    return this.manager.load(id);
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

  public list(): WorkspaceMetadata[] {
    return this.manager.list();
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
