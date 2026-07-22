import { DrawingPlugin } from './DrawingPlugin.ts';
import { DrawingObject, DrawingObjectProperties, DrawingPoint } from '../types/index.ts';
import { HorizontalLine } from '../objects/HorizontalLine.ts';

export class HorizontalLinePlugin implements DrawingPlugin {
  public readonly type = 'horizontal-line';
  public readonly name = 'Horizontal Line';

  public createInstance(
    id: string,
    points: DrawingPoint[],
    properties?: DrawingObjectProperties
  ): DrawingObject {
    return new HorizontalLine(id, points, properties);
  }
}
