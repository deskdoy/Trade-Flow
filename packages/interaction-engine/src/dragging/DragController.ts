import { DrawingEngine, DrawingObject, DrawingPoint } from '@tradeflow/drawing-engine';
import { InteractionEventEmitter } from '../events/InteractionEvents.ts';
import {
  CoordinateConverter,
  DragState,
  HitTargetType,
  PixelPoint,
  SnappingOptions,
} from '../types/index.ts';

export class DragController {
  private drawingEngine: DrawingEngine;
  private events: InteractionEventEmitter;
  private dragState: DragState = {
    isDragging: false,
    drawingId: null,
    targetType: null,
    startPixel: null,
    startPoints: [],
    lastPrice: null,
  };
  private snapping: SnappingOptions = { enabled: false, priceStep: 0.5 };

  constructor(drawingEngine: DrawingEngine, events: InteractionEventEmitter) {
    this.drawingEngine = drawingEngine;
    this.events = events;
  }

  public setSnapping(options: SnappingOptions): void {
    this.snapping = { ...this.snapping, ...options };
  }

  public getDragState(): DragState {
    return { ...this.dragState };
  }

  public isDragging(): boolean {
    return this.dragState.isDragging;
  }

  /**
   * Starts drag operation on a targeted drawing or handle
   */
  public startDrag(
    drawing: DrawingObject,
    targetType: HitTargetType,
    startPixel: PixelPoint
  ): void {
    this.dragState = {
      isDragging: true,
      drawingId: drawing.id,
      targetType,
      startPixel,
      startPoints: drawing.points.map((p) => ({ ...p })),
      lastPrice: null,
    };

    this.events.emit('interaction.drag.start', {
      drawing,
      targetType,
    });
  }

  /**
   * Processes move delta during active drag
   */
  public moveDrag(currentPixel: PixelPoint, converter: CoordinateConverter): void {
    if (!this.dragState.isDragging || !this.dragState.drawingId || !this.dragState.startPixel) {
      return;
    }

    const drawing = this.drawingEngine.getDrawing(this.dragState.drawingId);
    if (!drawing) return;

    const currentPrice = converter.yToPrice(currentPixel.y);
    const startPrice = converter.yToPrice(this.dragState.startPixel.y);

    if (currentPrice === null || startPrice === null) return;

    let targetPrice = currentPrice;

    // Apply snapping if enabled
    if (this.snapping.enabled && this.snapping.priceStep && this.snapping.priceStep > 0) {
      targetPrice = Math.round(targetPrice / this.snapping.priceStep) * this.snapping.priceStep;
    }

    if (this.dragState.targetType === 'body') {
      // Dragging entire object
      const deltaPrice = targetPrice - startPrice;
      drawing.points = this.dragState.startPoints.map((pt) => {
        let p = pt.price + deltaPrice;
        if (this.snapping.enabled && this.snapping.priceStep && this.snapping.priceStep > 0) {
          p = Math.round(p / this.snapping.priceStep) * this.snapping.priceStep;
        }
        return {
          time: pt.time,
          price: parseFloat(p.toFixed(4)),
        };
      });
      this.drawingEngine.updateDrawing(drawing.id, drawing.points);
      this.events.emit('interaction.drag.move', { drawing, deltaPrice });
    } else if (this.dragState.targetType === 'handle-0') {
      // Dragging endpoint 0
      const newTime = converter.xToTime(currentPixel.x) || drawing.points[0]?.time || '';
      drawing.points[0] = {
        time: newTime,
        price: parseFloat(targetPrice.toFixed(4)),
      };
      this.drawingEngine.updateDrawing(drawing.id, drawing.points);
      this.events.emit('interaction.drag.move', { drawing, deltaPrice: 0 });
    } else if (this.dragState.targetType === 'handle-1') {
      // Dragging endpoint 1
      if (drawing.points.length > 1) {
        const newTime = converter.xToTime(currentPixel.x) || drawing.points[1]?.time || '';
        drawing.points[1] = {
          time: newTime,
          price: parseFloat(targetPrice.toFixed(4)),
        };
        this.drawingEngine.updateDrawing(drawing.id, drawing.points);
        this.events.emit('interaction.drag.move', { drawing, deltaPrice: 0 });
      }
    }
  }

  /**
   * Ends active drag operation
   */
  public endDrag(): void {
    if (!this.dragState.isDragging || !this.dragState.drawingId) {
      return;
    }

    const drawing = this.drawingEngine.getDrawing(this.dragState.drawingId);
    this.dragState = {
      isDragging: false,
      drawingId: null,
      targetType: null,
      startPixel: null,
      startPoints: [],
      lastPrice: null,
    };

    if (drawing) {
      this.events.emit('interaction.drag.end', { drawing });
    }
  }
}
