import { WorkspaceMetadata } from '../types/index.ts';
import { WorkspaceStorageProvider } from '../storage/WorkspaceStorage.ts';

export class WorkspaceRegistry {
  private metadataMap: Map<string, WorkspaceMetadata> = new Map();

  public register(meta: WorkspaceMetadata): void {
    this.metadataMap.set(meta.id, meta);
  }

  public unregister(id: string): boolean {
    return this.metadataMap.delete(id);
  }

  public get(id: string): WorkspaceMetadata | undefined {
    return this.metadataMap.get(id);
  }

  public has(id: string): boolean {
    return this.metadataMap.has(id);
  }

  public list(filter?: { tag?: string; search?: string }): WorkspaceMetadata[] {
    let items = Array.from(this.metadataMap.values());

    if (filter?.tag) {
      const searchTag = filter.tag.toLowerCase();
      items = items.filter((item) =>
        item.tags?.some((t) => t.toLowerCase() === searchTag)
      );
    }

    if (filter?.search) {
      const term = filter.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term)
      );
    }

    return items.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public clear(): void {
    this.metadataMap.clear();
  }

  /**
   * Rebuilds registry metadata index from storage
   */
  public syncFromStorage(storage: WorkspaceStorageProvider): void {
    this.clear();
    const keys = storage.keys();

    for (const key of keys) {
      if (!key.startsWith('ws_')) continue;
      const raw = storage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        if (parsed.workspace && parsed.workspace.id) {
          const ws = parsed.workspace;
          const meta: WorkspaceMetadata = parsed.metadata || {
            id: ws.id,
            name: ws.name,
            description: ws.description,
            tags: ws.tags,
            platformVersion: '1.0.0',
            workspaceVersion: parsed.version || 1,
            createdAt: parsed.createdAt || new Date().toISOString(),
            updatedAt: parsed.updatedAt || new Date().toISOString(),
          };
          this.register(meta);
        }
      } catch {
        // Skip unparseable keys
      }
    }
  }
}
