import { EngineHealth, EngineLifecycle, SnapshotProvider } from '@tradeflow/core';
import { DrawingRegistry } from '../registry/DrawingRegistry.ts';
import { DrawingEventEmitter, DrawingEventListener, DrawingEventType } from '../events/DrawingEvents.ts';
import { Serializer } from '../serialization/Serializer.ts';
import {
  DrawingObject,
  DrawingObjectProperties,
  DrawingPoint,
} from '../types/index.ts';
import { DrawingPlugin } from '../plugins/DrawingPlugin.ts';
import { generateDrawingId } from '../utils/index.ts';

export class DrawingEngine implements SnapshotProvider<string>, EngineLifecycle {
  private drawings: Map<string, DrawingObject> = new Map();
  private selectedDrawingId: string | null = null;
  private registry: DrawingRegistry;
  private events: DrawingEventEmitter = new DrawingEventEmitter();
  private startTime: number = Date.now();

  constructor(registry?: DrawingRegistry) {
    this.registry = registry ?? new DrawingRegistry(true);
  }

  public initialize(): void {
    // Lifecycle initialization
  }

  public getVersion(): string {
    return '1.0.0';
  }

  public getHealth(): EngineHealth {
    return {
      healthy: true,
      version: this.getVersion(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      objectCount: this.drawings.size,
    };
  }

  public reset(): void {
    this.clearDrawings();
  }

  public destroy(): void {
    this.clearDrawings();
    this.events.removeAllListeners();
  }

  public getSnapshot(): string {
    return this.serialize();
  }

  public restoreSnapshot(snapshot: string): void {
    this.deserialize(snapshot);
  }

  private emitEvent<K extends DrawingEventType>(event: K, payload: any): void {
    this.events.emit(event, payload);
  }


  /**
   * Access the underlying DrawingRegistry
   */
  public getRegistry(): DrawingRegistry {
    return this.registry;
  }

  /**
   * Register a new plugin
   */
  public registerPlugin(plugin: DrawingPlugin): void {
    this.registry.register(plugin);
  }

  /**
   * Unregister a plugin
   */
  public unregisterPlugin(type: string): void {
    this.registry.unregister(type);
  }

  /**
   * Create and register a new DrawingObject
   */
  public createDrawing(
    type: string,
    id: string | undefined,
    points: DrawingPoint[],
    properties?: DrawingObjectProperties
  ): DrawingObject {
    const drawingId = id || generateDrawingId(type);
    const drawing = this.registry.create(type, drawingId, points, properties);
    this.drawings.set(drawing.id, drawing);

    this.events.emit('drawing.created', { drawing });
    this.events.emit('drawing.object.created', { drawing });
    return drawing;
  }

  /**
   * Remove a drawing by ID
   */
  public removeDrawing(id: string): void {
    const drawing = this.drawings.get(id);
    if (!drawing) return;

    if (this.selectedDrawingId === id) {
      this.clearSelection();
    }

    drawing.destroy();
    this.drawings.delete(id);
    this.events.emit('drawing.deleted', { id });
    this.events.emit('drawing.object.deleted', { id });
  }

  /**
   * Update points or properties of a drawing
   */
  public updateDrawing(
    id: string,
    points?: DrawingPoint[],
    properties?: DrawingObjectProperties
  ): DrawingObject | undefined {
    const drawing = this.drawings.get(id);
    if (!drawing) return undefined;

    if (points) {
      drawing.points = points;
    }

    if (properties) {
      drawing.properties = {
        ...drawing.properties,
        ...properties,
      };
    }

    this.events.emit('drawing.updated', { drawing });
    this.events.emit('drawing.object.updated', { drawing });
    return drawing;
  }

  /**
   * Select a drawing by ID
   */
  public selectDrawing(id: string | null): void {
    if (this.selectedDrawingId === id) {
      return;
    }

    // Deselect old
    if (this.selectedDrawingId) {
      const prev = this.drawings.get(this.selectedDrawingId);
      if (prev) {
        prev.selected = false;
        this.events.emit('drawing.deselected', { drawing: prev });
        this.events.emit('drawing.object.deselected', { drawing: prev });
        this.events.emit('drawing.updated', { drawing: prev });
        this.events.emit('drawing.object.updated', { drawing: prev });
      }
    }

    this.selectedDrawingId = id;

    // Select new
    let currentSelected: DrawingObject | null = null;
    if (id) {
      const next = this.drawings.get(id);
      if (next) {
        next.selected = true;
        currentSelected = next;
        this.events.emit('drawing.selected', { drawing: next });
        this.events.emit('drawing.object.selected', { drawing: next });
        this.events.emit('drawing.updated', { drawing: next });
        this.events.emit('drawing.object.updated', { drawing: next });
      }
    } else {
      this.events.emit('drawing.selected', { drawing: null });
      this.events.emit('drawing.object.selected', { drawing: null });
    }
  }

  /**
   * Clear active selection
   */
  public clearSelection(): void {
    this.selectDrawing(null);
  }

  /**
   * Get currently selected drawing
   */
  public getSelectedDrawing(): DrawingObject | null {
    if (!this.selectedDrawingId) return null;
    return this.drawings.get(this.selectedDrawingId) || null;
  }

  /**
   * Move the currently selected drawing by delta price
   */
  public moveSelected(deltaPrice: number): void {
    const selected = this.getSelectedDrawing();
    if (selected) {
      selected.move(deltaPrice);
      this.events.emit('drawing.updated', { drawing: selected });
    }
  }

  /**
   * Retrieve a drawing by ID
   */
  public getDrawing(id: string): DrawingObject | undefined {
    return this.drawings.get(id);
  }

  /**
   * Retrieve all active drawings
   */
  public getDrawings(): DrawingObject[] {
    return Array.from(this.drawings.values());
  }

  /**
   * Remove all drawings
   */
  public clearDrawings(): void {
    this.clearSelection();
    for (const drawing of this.drawings.values()) {
      drawing.destroy();
      this.events.emit('drawing.deleted', { id: drawing.id });
    }
    this.drawings.clear();
  }

  /**
   * Serialize all drawings to JSON string
   */
  public serialize(): string {
    return Serializer.serialize(this.getDrawings());
  }

  /**
   * Deserialize JSON string and replace active drawings
   */
  public deserialize(json: string): void {
    this.clearDrawings();
    const loaded = Serializer.deserialize(json, this.registry);
    for (const drawing of loaded) {
      this.drawings.set(drawing.id, drawing);
      this.events.emit('drawing.created', { drawing });
      if (drawing.selected) {
        this.selectedDrawingId = drawing.id;
        this.events.emit('drawing.selected', { drawing });
      }
    }
  }

  /**
   * Subscribe to event
   */
  public on<K extends DrawingEventType>(
    event: K,
    listener: DrawingEventListener<K>
  ): void {
    this.events.on(event, listener);
  }

  /**
   * Unsubscribe from event
   */
  public off<K extends DrawingEventType>(
    event: K,
    listener: DrawingEventListener<K>
  ): void {
    this.events.off(event, listener);
  }
}
