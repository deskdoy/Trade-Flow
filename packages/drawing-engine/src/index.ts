export { DrawingEngine } from './core/DrawingEngine.ts';
export { DrawingRegistry } from './registry/DrawingRegistry.ts';
export { HorizontalLinePlugin } from './plugins/HorizontalLinePlugin.ts';
export { TrendLinePlugin } from './plugins/TrendLinePlugin.ts';
export type { DrawingPlugin } from './plugins/DrawingPlugin.ts';
export { BaseDrawingObject } from './objects/DrawingObject.ts';
export { HorizontalLine } from './objects/HorizontalLine.ts';
export { TrendLine } from './objects/TrendLine.ts';
export { Serializer } from './serialization/Serializer.ts';
export { DrawingEventEmitter } from './events/DrawingEvents.ts';
export type {
  DrawingEventType,
  DrawingEventPayloadMap,
  DrawingEventListener,
} from './events/DrawingEvents.ts';
export type {
  DrawingPoint,
  DrawingObjectProperties,
  SerializedDrawing,
  DrawingObject,
} from './types/index.ts';
export {
  generateDrawingId,
  getPriceDistanceRatio,
  pointToSegmentDistance,
} from './utils/index.ts';
