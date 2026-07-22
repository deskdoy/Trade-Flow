import { WorkspaceEventEmitter } from '../events/WorkspaceEvents.ts';
import { WorkspaceRegistry } from '../registry/WorkspaceRegistry.ts';
import { WorkspaceSerializer } from '../serialization/WorkspaceSerializer.ts';
import { SnapshotProvider } from '../snapshot/SnapshotProvider.ts';
import { LocalStorageProvider } from '../storage/LocalStorageProvider.ts';
import { WorkspaceStorageProvider } from '../storage/WorkspaceStorage.ts';
import { WorkspaceData, WorkspaceMetadata } from '../types/index.ts';
import { WorkspaceValidator } from '../validation/WorkspaceValidator.ts';

export class WorkspaceManager {
  private storage: WorkspaceStorageProvider;
  private serializer: WorkspaceSerializer;
  private validator: WorkspaceValidator;
  private events: WorkspaceEventEmitter;
  private registry: WorkspaceRegistry = new WorkspaceRegistry();
  private snapshotProviders: Map<string, SnapshotProvider> = new Map();

  constructor(
    events: WorkspaceEventEmitter,
    storage?: WorkspaceStorageProvider,
    validator?: WorkspaceValidator
  ) {
    this.events = events;
    this.storage = storage ?? new LocalStorageProvider();
    this.validator = validator ?? new WorkspaceValidator();
    this.serializer = new WorkspaceSerializer(this.validator);

    // Initial sync of lightweight registry metadata
    this.registry.syncFromStorage(this.storage);
  }

  public getStorage(): WorkspaceStorageProvider {
    return this.storage;
  }

  public getValidator(): WorkspaceValidator {
    return this.validator;
  }

  public getRegistry(): WorkspaceRegistry {
    return this.registry;
  }

  public registerSnapshotProvider(provider: SnapshotProvider): void {
    this.snapshotProviders.set(provider.id, provider);
  }

  public unregisterSnapshotProvider(providerId: string): void {
    this.snapshotProviders.delete(providerId);
  }

  public getSnapshotProvider(providerId: string): SnapshotProvider | undefined {
    return this.snapshotProviders.get(providerId);
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
        existingCreatedAt = parsed.createdAt || parsed.metadata?.createdAt;
      } catch {
        // Ignore JSON parse errors on existing record
      }
    }

    const jsonStr = this.serializer.serialize(workspace, existingCreatedAt);

    // Validate before saving to storage
    const envelope = this.serializer.deserialize(jsonStr);

    this.storage.setItem(key, jsonStr);

    const meta: WorkspaceMetadata = envelope.metadata || {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      tags: workspace.tags,
      platformVersion: '1.0.0',
      workspaceVersion: envelope.version,
      createdAt: envelope.createdAt,
      updatedAt: envelope.updatedAt,
    };

    this.registry.register(meta);

    this.events.emit('workspace.saved', { workspace: envelope.workspace });
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
   * Checks if workspace exists by ID
   */
  public exists(id: string): boolean {
    return this.registry.has(id) || this.storage.exists(`ws_${id}`);
  }

  /**
   * Deletes a workspace by ID
   */
  public delete(id: string): boolean {
    const key = `ws_${id}`;
    const exists = this.storage.exists(key);
    if (exists) {
      this.storage.removeItem(key);
      this.registry.unregister(id);
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
   * Lists metadata for all stored workspaces via lightweight WorkspaceRegistry
   */
  public list(filter?: { tag?: string; search?: string }): WorkspaceMetadata[] {
    return this.registry.list(filter);
  }

  /**
   * Exports a workspace to a JSON string
   */
  public export(id: string): string {
    const key = `ws_${id}`;
    const raw = this.storage.export ? this.storage.export(key) : this.storage.getItem(key);
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
