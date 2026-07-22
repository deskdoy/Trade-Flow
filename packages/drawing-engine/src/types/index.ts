export interface DrawingPoint {
  time: string; // YYYY-MM-DD or ISO timestamp
  price: number;
}

export interface DrawingObjectProperties {
  color?: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  [key: string]: unknown;
}

export interface SerializedDrawing {
  id: string;
  type: string;
  selected: boolean;
  visible: boolean;
  points: DrawingPoint[];
  properties: Record<string, unknown>;
}

export interface DrawingObject {
  id: string;
  type: string;
  selected: boolean;
  visible: boolean;
  points: DrawingPoint[];
  properties: DrawingObjectProperties;

  serialize(): SerializedDrawing;
  move(deltaPrice: number, deltaTimeSeconds?: number): void;
  destroy(): void;
  getRenderPoints?(allCandleTimes?: string[]): DrawingPoint[];
}

export interface DrawingPlugin {
  readonly type: string;
  readonly name: string;
  createInstance(
    id: string,
    points: DrawingPoint[],
    properties?: DrawingObjectProperties
  ): DrawingObject;
}
