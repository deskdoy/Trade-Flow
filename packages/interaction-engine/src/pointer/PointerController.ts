import { DrawingEngine } from '@tradeflow/drawing-engine';
import { InteractionEventEmitter } from '../events/InteractionEvents.ts';
import { DragController } from '../dragging/DragController.ts';
import { HitTester } from '../hit-testing/HitTester.ts';
import { SelectionController } from '../selection/SelectionController.ts';
import {
  CoordinateConverter,
  CursorState,
  HitResult,
  PixelPoint,
} from '../types/index.ts';

export class PointerController {
  private drawingEngine: DrawingEngine;
  private selectionController: SelectionController;
  private dragController: DragController;
  private hitTester: HitTester;
  private events: InteractionEventEmitter;

  private targetElement: HTMLElement | null = null;
  private converter: CoordinateConverter | null = null;
  private currentCursor: CursorState = 'default';
  private lastHit: HitResult | null = null;
  private rafId: number | null = null;

  private downListener: (e: PointerEvent) => void;
  private moveListener: (e: PointerEvent) => void;
  private upListener: (e: PointerEvent) => void;
  private leaveListener: (e: PointerEvent) => void;

  constructor(
    drawingEngine: DrawingEngine,
    selectionController: SelectionController,
    dragController: DragController,
    hitTester: HitTester,
    events: InteractionEventEmitter
  ) {
    this.drawingEngine = drawingEngine;
    this.selectionController = selectionController;
    this.dragController = dragController;
    this.hitTester = hitTester;
    this.events = events;

    this.downListener = this.onPointerDown.bind(this);
    this.moveListener = this.onPointerMove.bind(this);
    this.upListener = this.onPointerUp.bind(this);
    this.leaveListener = this.onPointerLeave.bind(this);
  }

  public attach(element: HTMLElement, converter: CoordinateConverter): void {
    this.detach();
    this.targetElement = element;
    this.converter = converter;

    this.targetElement.addEventListener('pointerdown', this.downListener);
    this.targetElement.addEventListener('pointermove', this.moveListener);
    this.targetElement.addEventListener('pointerup', this.upListener);
    this.targetElement.addEventListener('pointerleave', this.leaveListener);
  }

  public detach(): void {
    if (this.targetElement) {
      this.targetElement.removeEventListener('pointerdown', this.downListener);
      this.targetElement.removeEventListener('pointermove', this.moveListener);
      this.targetElement.removeEventListener('pointerup', this.upListener);
      this.targetElement.removeEventListener('pointerleave', this.leaveListener);
      this.targetElement = null;
    }
    this.converter = null;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public setCoordinateConverter(converter: CoordinateConverter): void {
    this.converter = converter;
  }

  public getCurrentCursor(): CursorState {
    return this.currentCursor;
  }

  private getRelativePixel(e: PointerEvent): PixelPoint {
    if (!this.targetElement) return { x: e.clientX, y: e.clientY };
    const rect = this.targetElement.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private updateCursor(cursor: CursorState): void {
    if (this.currentCursor !== cursor) {
      this.currentCursor = cursor;
      if (this.targetElement) {
        this.targetElement.style.cursor = cursor;
      }
      this.events.emit('interaction.cursor.change', { cursor });
    }
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.converter) return;
    const pixel = this.getRelativePixel(e);
    const hit = this.hitTester.test(pixel, this.drawingEngine.getDrawings(), this.converter);

    if (hit) {
      // Single selection or multi-selection toggle
      if (e.ctrlKey || e.metaKey) {
        this.selectionController.toggleSelect(hit.drawing);
      } else {
        this.selectionController.select(hit.drawing);
      }

      // Start drag operation
      this.dragController.startDrag(hit.drawing, hit.targetType, pixel);
      this.updateCursor('move');
    } else if (!e.ctrlKey && !e.metaKey) {
      this.selectionController.clearSelection();
      this.updateCursor('crosshair');
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.converter) return;
    const pixel = this.getRelativePixel(e);

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;

      if (this.dragController.isDragging()) {
        this.dragController.moveDrag(pixel, this.converter!);
      } else {
        const hit = this.hitTester.test(pixel, this.drawingEngine.getDrawings(), this.converter!);
        this.lastHit = hit;

        this.events.emit('interaction.hover', { hit, pixel });

        if (hit) {
          if (hit.targetType === 'handle-0' || hit.targetType === 'handle-1') {
            this.updateCursor('ns-resize');
          } else {
            this.updateCursor('pointer');
          }
        } else {
          this.updateCursor('crosshair');
        }
      }
    });
  }

  private onPointerUp(_e: PointerEvent): void {
    if (this.dragController.isDragging()) {
      this.dragController.endDrag();
      if (this.lastHit) {
        this.updateCursor('pointer');
      } else {
        this.updateCursor('crosshair');
      }
    }
  }

  private onPointerLeave(_e: PointerEvent): void {
    if (this.dragController.isDragging()) {
      this.dragController.endDrag();
    }
    this.updateCursor('default');
  }
}
