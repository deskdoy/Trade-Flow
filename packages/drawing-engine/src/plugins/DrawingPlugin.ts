import { DrawingObject, DrawingObjectProperties, DrawingPoint } from '../types/index.ts';

export interface DrawingPlugin {
  readonly type: string;
  readonly name: string;
  createInstance(
    id: string,
    points: DrawingPoint[],
    properties?: DrawingObjectProperties
  ): DrawingObject;
}
