import { DrawingObject } from '@tradeflow/drawing-engine';
import { CoordinateConverter, HitResult, PixelPoint } from '../types/index.ts';

export class HitTester {
  private thresholdPixels: number;

  constructor(thresholdPixels: number = 8) {
    this.thresholdPixels = thresholdPixels;
  }

  public setThreshold(pixels: number): void {
    this.thresholdPixels = pixels;
  }

  public getThreshold(): number {
    return this.thresholdPixels;
  }

  /**
   * Tests pointer pixel against drawings and returns closest hit within threshold
   */
  public test(
    pixel: PixelPoint,
    drawings: DrawingObject[],
    converter: CoordinateConverter
  ): HitResult | null {
    let bestHit: HitResult | null = null;
    let minDistance = Infinity;

    for (const drawing of drawings) {
      if (!drawing.visible) continue;

      // 1. Check selection handles first if drawing is selected
      if (drawing.selected && drawing.points.length > 0) {
        for (let i = 0; i < drawing.points.length; i++) {
          const pt = drawing.points[i];
          const hX = converter.timeToX(pt.time);
          const hY = converter.priceToY(pt.price);

          if (hY !== null) {
            // Handle coordinate distance calculation
            const dx = hX !== null ? pixel.x - hX : 0;
            const dy = pixel.y - hY;
            const dist = hX !== null ? Math.hypot(dx, dy) : Math.abs(dy);

            if (dist <= this.thresholdPixels + 4 && dist < minDistance) {
              minDistance = dist;
              bestHit = {
                drawing,
                targetType: i === 0 ? 'handle-0' : 'handle-1',
                distance: dist,
                handleIndex: i,
              };
            }
          }
        }
      }

      // 2. Check line body if no handle was hit within tight threshold
      if (drawing.type === 'horizontal-line') {
        const lineY = converter.priceToY(drawing.points[0]?.price ?? 0);
        if (lineY !== null) {
          const dist = Math.abs(pixel.y - lineY);
          if (dist <= this.thresholdPixels && dist < minDistance) {
            minDistance = dist;
            bestHit = {
              drawing,
              targetType: 'body',
              distance: dist,
            };
          }
        }
      } else if (drawing.type === 'trend-line' && drawing.points.length >= 2) {
        const p1 = drawing.points[0];
        const p2 = drawing.points[1];
        const y1 = converter.priceToY(p1.price);
        const y2 = converter.priceToY(p2.price);
        const x1 = converter.timeToX(p1.time);
        const x2 = converter.timeToX(p2.time);

        if (y1 !== null && y2 !== null) {
          let dist: number;
          if (x1 !== null && x2 !== null) {
            dist = this.pointToSegmentDistance(pixel.x, pixel.y, x1, y1, x2, y2);
          } else {
            // Fallback to y-axis interpolation distance
            dist = Math.abs(pixel.y - (y1 + y2) / 2);
          }

          if (dist <= this.thresholdPixels && dist < minDistance) {
            minDistance = dist;
            bestHit = {
              drawing,
              targetType: 'body',
              distance: dist,
            };
          }
        }
      }
    }

    return bestHit;
  }

  private pointToSegmentDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) {
      return Math.hypot(px - x1, py - y1);
    }
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.hypot(px - projX, py - projY);
  }
}
