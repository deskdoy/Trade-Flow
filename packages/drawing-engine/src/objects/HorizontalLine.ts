import { BaseDrawingObject } from './DrawingObject.ts';
import { DrawingObjectProperties, DrawingPoint, SerializedDrawing } from '../types/index.ts';

export class HorizontalLine extends BaseDrawingObject {
  constructor(
    id: string,
    points: DrawingPoint[],
    properties?: DrawingObjectProperties
  ) {
    const defaultPoint = points[0] ?? { time: '', price: Number(properties?.price ?? 0) };
    const initialPrice = defaultPoint.price;

    super(id, 'horizontal-line', [defaultPoint], {
      color: '#ef4444',
      lineWidth: 2,
      lineStyle: 'solid',
      price: initialPrice,
      ...properties,
    });
  }

  public get price(): number {
    return Number(this.properties.price ?? this.points[0]?.price ?? 0);
  }

  public set price(val: number) {
    this.properties.price = val;
    if (this.points[0]) {
      this.points[0].price = val;
    }
  }

  public override move(deltaPrice: number): void {
    const newPrice = parseFloat((this.price + deltaPrice).toFixed(4));
    this.price = newPrice;
  }

  public override serialize(): SerializedDrawing {
    return {
      id: this.id,
      type: this.type,
      selected: this.selected,
      visible: this.visible,
      points: this.points,
      properties: {
        ...this.properties,
        price: this.price,
      },
    };
  }

  public getRenderPoints(allCandleTimes?: string[]): DrawingPoint[] {
    const currentPrice = this.price;
    if (allCandleTimes && allCandleTimes.length > 0) {
      return [
        { time: allCandleTimes[0], price: currentPrice },
        { time: allCandleTimes[allCandleTimes.length - 1], price: currentPrice },
      ];
    }
    return [
      { time: this.points[0]?.time || '1970-01-01', price: currentPrice },
      { time: '2099-12-31', price: currentPrice },
    ];
  }
}
