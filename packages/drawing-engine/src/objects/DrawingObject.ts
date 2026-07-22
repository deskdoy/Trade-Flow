import { DrawingObject, DrawingObjectProperties, DrawingPoint, SerializedDrawing } from '../types/index.ts';

export type { DrawingObject, DrawingObjectProperties, DrawingPoint, SerializedDrawing };

export abstract class BaseDrawingObject implements DrawingObject {
  public id: string;
  public type: string;
  public selected: boolean = false;
  public visible: boolean = true;
  public points: DrawingPoint[];
  public properties: DrawingObjectProperties;

  constructor(
    id: string,
    type: string,
    points: DrawingPoint[],
    properties?: DrawingObjectProperties
  ) {
    this.id = id;
    this.type = type;
    this.points = points;
    this.properties = {
      color: '#10b981',
      lineWidth: 2,
      lineStyle: 'solid',
      ...properties,
    };
  }

  public serialize(): SerializedDrawing {
    return {
      id: this.id,
      type: this.type,
      selected: this.selected,
      visible: this.visible,
      points: this.points,
      properties: { ...this.properties },
    };
  }

  public abstract move(deltaPrice: number, deltaTimeSeconds?: number): void;

  public destroy(): void {
    // Default cleanup logic if needed
  }
}
