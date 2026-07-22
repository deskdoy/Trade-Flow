import { DrawingPlugin } from './DrawingPlugin.ts';
import { DrawingObject, DrawingObjectProperties, DrawingPoint } from '../types/index.ts';
import { TrendLine } from '../objects/TrendLine.ts';

export class TrendLinePlugin implements DrawingPlugin {
  public readonly type = 'trend-line';
  public readonly name = 'Trend Line';

  public createInstance(
    id: string,
    points: DrawingPoint[],
    properties?: DrawingObjectProperties
  ): DrawingObject {
    return new TrendLine(id, points, properties);
  }
}
