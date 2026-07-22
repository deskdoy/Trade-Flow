import { WorkspaceEventEmitter } from '../events/WorkspaceEvents.ts';
import { LocalStorageProvider } from '../storage/LocalStorageProvider.ts';
import { WorkspaceStorageProvider } from '../storage/WorkspaceStorage.ts';
import { WorkspaceSerializer } from '../serialization/WorkspaceSerializer.ts';

import { WorkspaceData, WorkspaceMetadata } from '../types/index.ts';
import { WorkspaceValidator } from '../validation/WorkspaceValidator.ts';

export class WorkspaceManager {
  private storage: WorkspaceStorageProvider;
  private serializer: WorkspaceSerializer;
  private validator: WorkspaceValidator;
  private events: WorkspaceEventEmitter;

  constructor(
    events: WorkspaceEventEmitter,
    storage?: WorkspaceStorageProvider,
    validator?: WorkspaceValidator
  ) {
    this.events = events;
    this.storage = storage ?? new LocalStorageProvider();
    this.validator = validator ?? new WorkspaceValidator();
    this.serializer = new WorkspaceSerializer(this.validator);
  }

  public getStorage(): WorkspaceStorageProvider {
    return this.storage;
  }

  public getValidator(): WorkspaceValidator {
    return this.validator;
  }

  /**
   * Saves or updates a workspace
   */
  public save(workspace: WorkspaceData): WorkspaceMetadata {
    const key = `ws_${workspace.id}`;
    let existingCreatedAt: string | undefined;

    const existingRaw = this.storage.getItem(key);
    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw);
        existingCreatedAt = parsed.createdAt;
      } catch {
        // Ignore JSON parse errors on existing record
      }
    }

    const jsonStr = this.serializer.serialize(workspace, existingCreatedAt);

    // Validate before saving to storage
    const envelope = this.serializer.deserialize(jsonStr);

    this.storage.setItem(key, jsonStr);

    const meta: WorkspaceMetadata = {
      id: workspace.id,
      name: workspace.name,
      version: envelope.version,
      createdAt: envelope.createdAt,
      updatedAt: envelope.updatedAt,
    };

    this.events.emit('workspace.saved', { workspace });
    return meta;
  }

  /**
   * Loads workspace data by ID
   */
  public load(id: string): WorkspaceData {
    const key = `ws_${id}`;
    const raw = this.storage.getItem(key);

    if (!raw) {
      throw new Error(`[WorkspaceManager] Workspace with ID "${id}" not found.`);
    }

    try {
      const envelope = this.serializer.deserialize(raw);
      this.events.emit('workspace.loaded', { workspace: envelope.workspace });
      return envelope.workspace;
    } catch (err) {
      const valResult = {
        valid: false,
        errors: [{ field: 'storage', message: err instanceof Error ? err.message : String(err) }],
      };
      this.events.emit('workspace.validation.failed', { id, result: valResult });
      throw err;
    }
  }

  /**
   * Deletes a workspace by ID
   */
  public delete(id: string): boolean {
    const key = `ws_${id}`;
    const exists = this.storage.getItem(key) !== null;
    if (exists) {
      this.storage.removeItem(key);
      this.events.emit('workspace.deleted', { id });
      return true;
    }
    return false;
  }

  /**
   * Renames a workspace
   */
  public rename(id: string, newName: string): WorkspaceData {
    const workspace = this.load(id);
    const oldName = workspace.name;
    workspace.name = newName;
    this.save(workspace);

    this.events.emit('workspace.renamed', { id, oldName, newName });
    return workspace;
  }

  /**
   * Duplicates an existing workspace with a new ID
   */
  public duplicate(id: string, newName?: string): WorkspaceData {
    const original = this.load(id);
    const newId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const copyName = newName || `${original.name} (Copy)`;

    const duplicated: WorkspaceData = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId,
      name: copyName,
    };

    this.save(duplicated);
    this.events.emit('workspace.created', { workspace: duplicated });
    return duplicated;
  }

  /**
   * Lists metadata for all stored workspaces
   */
  public list(): WorkspaceMetadata[] {
    const keys = this.storage.keys();
    const result: WorkspaceMetadata[] = [];

    for (const k of keys) {
      if (!k.startsWith('ws_')) continue;
      const raw = this.storage.getItem(k);
      if (!raw) continue;

      try {
        const envelope = this.serializer.deserialize(raw);
        result.push({
          id: envelope.workspace.id,
          name: envelope.workspace.name,
          version: envelope.version,
          createdAt: envelope.createdAt,
          updatedAt: envelope.updatedAt,
        });
      } catch (err) {
        console.warn(`[WorkspaceManager] Skipping invalid workspace record "${k}":`, err);
      }
    }

    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Exports a workspace to a JSON string
   */
  public export(id: string): string {
    const key = `ws_${id}`;
    const raw = this.storage.getItem(key);
    if (!raw) {
      throw new Error(`[WorkspaceManager] Export failed: Workspace "${id}" not found.`);
    }

    // Verify valid before export
    this.serializer.deserialize(raw);

    this.events.emit('workspace.exported', { id, json: raw });
    return raw;
  }

  /**
   * Imports a workspace from JSON string payload
   */
  public import(jsonStr: string): WorkspaceData {
    try {
      const envelope = this.serializer.deserialize(jsonStr);
      this.save(envelope.workspace);
      this.events.emit('workspace.imported', { workspace: envelope.workspace });
      return envelope.workspace;
    } catch (err) {
      const valResult = {
        valid: false,
        errors: [{ field: 'import', message: err instanceof Error ? err.message : String(err) }],
      };
      this.events.emit('workspace.validation.failed', { result: valResult });
      throw err;
    }
  }
}
