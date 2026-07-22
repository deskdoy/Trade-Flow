import { DrawingObject } from '@tradeflow/drawing-engine';
import { CursorState, HitResult, HitTargetType, PixelPoint } from '../types/index.ts';

export type InteractionEventType =
  | 'interaction.hover'
  | 'interaction.select'
  | 'interaction.deselect'
  | 'interaction.drag.start'
  | 'interaction.drag.move'
  | 'interaction.drag.end'
  | 'interaction.key.delete'
  | 'interaction.key.escape'
  | 'interaction.cursor.change';

export interface InteractionEventPayloadMap {
  'interaction.hover': { hit: HitResult | null; pixel: PixelPoint };
  'interaction.select': { drawing: DrawingObject; selectedIds: string[] };
  'interaction.deselect': { selectedIds: string[] };
  'interaction.drag.start': { drawing: DrawingObject; targetType: HitTargetType };
  'interaction.drag.move': { drawing: DrawingObject; deltaPrice: number };
  'interaction.drag.end': { drawing: DrawingObject };
  'interaction.key.delete': { deletedIds: string[] };
  'interaction.key.escape': {};
  'interaction.cursor.change': { cursor: CursorState };
}

export type InteractionEventListener<T extends InteractionEventType> = (
  payload: InteractionEventPayloadMap[T]
) => void;

export class InteractionEventEmitter {
  private listeners: {
    [K in InteractionEventType]?: Set<InteractionEventListener<K>>;
  } = {};

  public on<K extends InteractionEventType>(
    event: K,
    listener: InteractionEventListener<K>
  ): void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set() as any;
    }
    (this.listeners[event] as Set<InteractionEventListener<K>>).add(listener);
  }

  public off<K extends InteractionEventType>(
    event: K,
    listener: InteractionEventListener<K>
  ): void {
    const eventSet = this.listeners[event];
    if (eventSet) {
      (eventSet as Set<InteractionEventListener<K>>).delete(listener);
    }
  }

  public emit<K extends InteractionEventType>(
    event: K,
    payload: InteractionEventPayloadMap[K]
  ): void {
    const eventSet = this.listeners[event];
    if (eventSet) {
      for (const listener of eventSet) {
        try {
          listener(payload);
        } catch (err) {
          console.error(`[InteractionEventEmitter] Error handling "${event}":`, err);
        }
      }
    }
  }

  public removeAllListeners(): void {
    this.listeners = {};
  }
}
