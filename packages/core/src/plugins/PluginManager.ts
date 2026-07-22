export interface Plugin {
  readonly id: string;
  readonly name: string;
  readonly version?: string;
  initialize?(): void | Promise<void>;
  destroy?(): void;
}

export class PluginManager<T extends Plugin = Plugin> {
  private plugins: Map<string, T> = new Map();

  public register(plugin: T): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginManager] Overwriting plugin with ID "${plugin.id}"`);
    }
    this.plugins.set(plugin.id, plugin);
    if (plugin.initialize) {
      plugin.initialize();
    }
  }

  public unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      if (plugin.destroy) {
        plugin.destroy();
      }
      this.plugins.delete(pluginId);
    }
  }

  public get(pluginId: string): T | undefined {
    return this.plugins.get(pluginId);
  }

  public list(): T[] {
    return Array.from(this.plugins.values());
  }

  public clear(): void {
    for (const plugin of this.plugins.values()) {
      if (plugin.destroy) {
        plugin.destroy();
      }
    }
    this.plugins.clear();
  }
}
