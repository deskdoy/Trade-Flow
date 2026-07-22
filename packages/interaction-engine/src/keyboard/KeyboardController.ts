import { DrawingEngine } from '@tradeflow/drawing-engine';
import { InteractionEventEmitter } from '../events/InteractionEvents.ts';
import { SelectionController } from '../selection/SelectionController.ts';

export class KeyboardController {
  private drawingEngine: DrawingEngine;
  private selectionController: SelectionController;
  private events: InteractionEventEmitter;
  private activeElement: HTMLElement | Window | null = null;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    drawingEngine: DrawingEngine,
    selectionController: SelectionController,
    events: InteractionEventEmitter
  ) {
    this.drawingEngine = drawingEngine;
    this.selectionController = selectionController;
    this.events = events;

    this.keyHandler = this.handleKeyDown.bind(this);
  }

  public attach(element: HTMLElement | Window = window): void {
    this.detach();
    this.activeElement = element;
    this.activeElement.addEventListener('keydown', this.keyHandler as EventListener);
  }

  public detach(): void {
    if (this.activeElement) {
      this.activeElement.removeEventListener('keydown', this.keyHandler as EventListener);
      this.activeElement = null;
    }
  }

  public handleKeyDown(e: KeyboardEvent): void {
    // Ignore input if focused inside an editable text area/input
    const target = e.target as HTMLElement;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    ) {
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      const selectedIds = this.selectionController.getSelectedIds();
      if (selectedIds.length > 0) {
        e.preventDefault();
        for (const id of selectedIds) {
          this.drawingEngine.removeDrawing(id);
        }
        this.selectionController.clearSelection();
        this.events.emit('interaction.key.delete', { deletedIds: selectedIds });
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.selectionController.clearSelection();
      this.events.emit('interaction.key.escape', {});
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      this.selectionController.selectAll();
    }
  }
}
