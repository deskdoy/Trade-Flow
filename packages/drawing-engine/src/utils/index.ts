import { DrawingPoint } from '../types/index.ts';

/**
 * Generates a unique drawing ID
 */
export function generateDrawingId(prefix: string = 'drawing'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Calculates normalized distance ratio between price and target price
 */
export function getPriceDistanceRatio(priceA: number, priceB: number): number {
  if (priceB === 0) return Math.abs(priceA - priceB);
  return Math.abs(priceA - priceB) / priceB;
}

/**
 * Distance from a point (time, price) to a line segment defined by two points
 */
export function pointToSegmentDistance(
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
