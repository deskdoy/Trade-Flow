import { DrawingEngine } from '@tradeflow/drawing-engine';
import { DragController } from '../dragging/DragController.ts';
import { InteractionEventEmitter, InteractionEventListener, InteractionEventType } from '../events/InteractionEvents.ts';
import { HitTester } from '../hit-testing/HitTester.ts';
import { KeyboardController } from '../keyboard/KeyboardController.ts';
import { PointerController } from '../pointer/PointerController.ts';
import { SelectionController } from '../selection/SelectionController.ts';
import {
  CoordinateConverter,
  CursorState,
  SelectionState,
  SnappingOptions,
} from '../types/index.ts';

export class InteractionEngine {
  private drawingEngine: DrawingEngine;
  private events: InteractionEventEmitter = new InteractionEventEmitter();

  private hitTester: HitTester;
  private selectionController: SelectionController;
  private dragController: DragController;
  private keyboardController: KeyboardController;
  private pointerController: PointerController;

  constructor(drawingEngine: DrawingEngine) {
    this.drawingEngine = drawingEngine;

    this.hitTester = new HitTester(8);
    this.selectionController = new SelectionController(this.drawingEngine, this.events);
    this.dragController = new DragController(this.drawingEngine, this.events);
    this.keyboardController = new KeyboardController(
      this.drawingEngine,
      this.selectionController,
      this.events
    );
    this.pointerController = new PointerController(
      this.drawingEngine,
      this.selectionController,
      this.dragController,
      this.hitTester,
      this.events
    );
  }

  /**
   * Attaches interaction engine listeners to DOM chart container
   */
  public attach(element: HTMLElement, converter: CoordinateConverter): void {
    this.pointerController.attach(element, converter);
    this.keyboardController.attach(window);
  }

  /**
   * Detaches interaction engine listeners
   */
  public detach(): void {
    this.pointerController.detach();
    this.keyboardController.detach();
  }

  /**
   * Configures price snapping options
   */
  public setSnapping(options: SnappingOptions): void {
    this.dragController.setSnapping(options);
  }

  /**
   * Configures hit tester threshold in pixels
   */
  public setHitThreshold(pixels: number): void {
    this.hitTester.setThreshold(pixels);
  }

  /**
   * Gets current selection state
   */
  public getSelectionState(): SelectionState {
    return this.selectionController.getSelectionState();
  }

  /**
   * Gets current cursor state
   */
  public getCursorState(): CursorState {
    return this.pointerController.getCurrentCursor();
  }

  /**
   * Clears selection
   */
  public clearSelection(): void {
    this.selectionController.clearSelection();
  }

  /**
   * Selects all visible drawings
   */
  public selectAll(): void {
    this.selectionController.selectAll();
  }

  /**
   * Deletes currently selected drawings
   */
  public deleteSelected(): void {
    const selectedIds = this.selectionController.getSelectedIds();
    for (const id of selectedIds) {
      this.drawingEngine.removeDrawing(id);
    }
    this.selectionController.clearSelection();
    this.events.emit('interaction.key.delete', { deletedIds: selectedIds });
  }

  /**
   * Event subscription
   */
  public on<K extends InteractionEventType>(
    event: K,
    listener: InteractionEventListener<K>
  ): void {
    this.events.on(event, listener);
  }

  /**
   * Event unsubscription
   */
  public off<K extends InteractionEventType>(
    event: K,
    listener: InteractionEventListener<K>
  ): void {
    this.events.off(event, listener);
  }

  /**
   * Destroys interaction engine instance
   */
  public destroy(): void {
    this.detach();
    this.events.removeAllListeners();
  }
}
