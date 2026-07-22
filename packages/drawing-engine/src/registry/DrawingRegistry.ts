import { DrawingPlugin } from '../plugins/DrawingPlugin.ts';
import { HorizontalLinePlugin } from '../plugins/HorizontalLinePlugin.ts';
import { TrendLinePlugin } from '../plugins/TrendLinePlugin.ts';
import { DrawingObject, DrawingObjectProperties, DrawingPoint } from '../types/index.ts';

export class DrawingRegistry {
  private plugins: Map<string, DrawingPlugin> = new Map();

  constructor(registerDefaults: boolean = true) {
    if (registerDefaults) {
      this.register(new HorizontalLinePlugin());
      this.register(new TrendLinePlugin());
    }
  }

  private normalizeType(type: string): string {
    return type.toLowerCase().replace(/_/g, '-');
  }

  /**
   * Registers a drawing plugin
   */
  public register(plugin: DrawingPlugin): void {
    const key = this.normalizeType(plugin.type);
    this.plugins.set(key, plugin);
  }

  /**
   * Unregisters a drawing plugin by type
   */
  public unregister(type: string): void {
    const key = this.normalizeType(type);
    this.plugins.delete(key);
  }

  /**
   * Gets a plugin by type
   */
  public get(type: string): DrawingPlugin | undefined {
    const key = this.normalizeType(type);
    return this.plugins.get(key);
  }

  /**
   * Returns a list of all registered plugins
   */
  public list(): DrawingPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Factory method to create a DrawingObject instance
   */
  public create(
    type: string,
    id: string,
    points: DrawingPoint[],
    properties?: DrawingObjectProperties
  ): DrawingObject {
    const plugin = this.get(type);
    if (!plugin) {
      throw new Error(`[DrawingRegistry] No registered plugin found for type: "${type}".`);
    }
    return plugin.createInstance(id, points, properties);
  }
}
