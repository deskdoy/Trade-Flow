import { DrawingObject, SerializedDrawing } from '../types/index.ts';
import { DrawingRegistry } from '../registry/DrawingRegistry.ts';

export class Serializer {
  /**
   * Serializes an array of DrawingObjects to a JSON string
   */
  public static serialize(drawings: DrawingObject[]): string {
    const data: SerializedDrawing[] = drawings.map((drawing) => drawing.serialize());
    return JSON.stringify(data, null, 2);
  }

  /**
   * Deserializes a JSON string back into an array of DrawingObjects using DrawingRegistry
   */
  public static deserialize(
    json: string,
    registry: DrawingRegistry
  ): DrawingObject[] {
    if (!json || typeof json !== 'string') {
      return [];
    }

    try {
      const parsed: SerializedDrawing[] = JSON.parse(json);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map((item) => {
        const drawing = registry.create(
          item.type,
          item.id,
          item.points || [],
          item.properties || {}
        );
        drawing.selected = !!item.selected;
        drawing.visible = item.visible !== undefined ? item.visible : true;
        return drawing;
      });
    } catch (err) {
      console.error('[Serializer] Failed to deserialize JSON:', err);
      return [];
    }
  }
}
