import { BaseDrawingObject } from './DrawingObject.ts';
import { DrawingObjectProperties, DrawingPoint, SerializedDrawing } from '../types/index.ts';

export class TrendLine extends BaseDrawingObject {
  constructor(
    id: string,
    points: DrawingPoint[],
    properties?: DrawingObjectProperties
  ) {
    let trendPoints: DrawingPoint[];
    if (points.length >= 2) {
      trendPoints = [points[0], points[1]];
    } else if (points.length === 1) {
      trendPoints = [points[0], { ...points[0] }];
    } else {
      trendPoints = [
        { time: '', price: 0 },
        { time: '', price: 0 },
      ];
    }

    super(id, 'trend-line', trendPoints, {
      color: '#10b981',
      lineWidth: 2,
      lineStyle: 'solid',
      ...properties,
    });
  }

  public override move(deltaPrice: number): void {
    for (const pt of this.points) {
      pt.price = parseFloat((pt.price + deltaPrice).toFixed(4));
    }
  }

  public override serialize(): SerializedDrawing {
    return {
      id: this.id,
      type: this.type,
      selected: this.selected,
      visible: this.visible,
      points: this.points.map((p) => ({ ...p })),
      properties: { ...this.properties },
    };
  }

  public getRenderPoints(): DrawingPoint[] {
    return this.points;
  }
}
