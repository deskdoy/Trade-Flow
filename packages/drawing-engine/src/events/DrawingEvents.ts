import { DrawingObject } from '../types/index.ts';

export type DrawingEventType =
  | 'drawing.created'
  | 'drawing.updated'
  | 'drawing.deleted'
  | 'drawing.selected'
  | 'drawing.deselected'
  | 'drawing.object.created'
  | 'drawing.object.updated'
  | 'drawing.object.deleted'
  | 'drawing.object.selected'
  | 'drawing.object.deselected';

export interface DrawingEventPayloadMap {
  'drawing.created': { drawing: DrawingObject };
  'drawing.updated': { drawing: DrawingObject };
  'drawing.deleted': { id: string };
  'drawing.selected': { drawing: DrawingObject | null };
  'drawing.deselected': { drawing: DrawingObject | null };
  'drawing.object.created': { drawing: DrawingObject };
  'drawing.object.updated': { drawing: DrawingObject };
  'drawing.object.deleted': { id: string };
  'drawing.object.selected': { drawing: DrawingObject | null };
  'drawing.object.deselected': { drawing: DrawingObject | null };
}

export type DrawingEventListener<T extends DrawingEventType> = (
  payload: DrawingEventPayloadMap[T]
) => void;

export class DrawingEventEmitter {
  private listeners: {
    [K in DrawingEventType]?: Set<DrawingEventListener<K>>;
  } = {};

  public on<K extends DrawingEventType>(
    event: K,
    listener: DrawingEventListener<K>
  ): void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set() as any;
    }
    (this.listeners[event] as Set<DrawingEventListener<K>>).add(listener);
  }

  public off<K extends DrawingEventType>(
    event: K,
    listener: DrawingEventListener<K>
  ): void {
    const eventSet = this.listeners[event];
    if (eventSet) {
      (eventSet as Set<DrawingEventListener<K>>).delete(listener);
    }
  }

  public emit<K extends DrawingEventType>(
    event: K,
    payload: DrawingEventPayloadMap[K]
  ): void {
    const eventSet = this.listeners[event];
    if (eventSet) {
      for (const listener of eventSet) {
        try {
          listener(payload);
        } catch (err) {
          console.error(`[DrawingEventEmitter] Error handling event "${event}":`, err);
        }
      }
    }
  }

  public removeAllListeners(): void {
    this.listeners = {};
  }
}
