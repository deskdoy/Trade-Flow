import { DrawingObject, DrawingPoint } from '@tradeflow/drawing-engine';

export type CursorState =
  | 'default'
  | 'pointer'
  | 'crosshair'
  | 'move'
  | 'ns-resize'
  | 'ew-resize'
  | 'nesw-resize'
  | 'nwse-resize';

export interface PixelPoint {
  x: number;
  y: number;
}

export interface CoordinateConverter {
  priceToY(price: number): number | null;
  yToPrice(y: number): number | null;
  timeToX(time: string): number | null;
  xToTime(x: number): string | null;
}

export type HitTargetType = 'body' | 'handle-0' | 'handle-1';

export interface HitResult {
  drawing: DrawingObject;
  targetType: HitTargetType;
  distance: number;
  handleIndex?: number;
}

export interface SelectionState {
  selectedIds: Set<string>;
  primaryId: string | null;
}

export interface DragState {
  isDragging: boolean;
  drawingId: string | null;
  targetType: HitTargetType | null;
  startPixel: PixelPoint | null;
  startPoints: DrawingPoint[];
  lastPrice: number | null;
}

export interface SnappingOptions {
  enabled: boolean;
  priceStep?: number; // e.g. snap to nearest $0.50 or $1.00 or $0.05
}
