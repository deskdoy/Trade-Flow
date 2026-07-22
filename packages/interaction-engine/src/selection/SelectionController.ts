import { DrawingEngine, DrawingObject } from '@tradeflow/drawing-engine';
import { InteractionEventEmitter } from '../events/InteractionEvents.ts';
import { SelectionState } from '../types/index.ts';

export class SelectionController {
  private drawingEngine: DrawingEngine;
  private events: InteractionEventEmitter;
  private selectedIds: Set<string> = new Set();
  private primaryId: string | null = null;

  constructor(drawingEngine: DrawingEngine, events: InteractionEventEmitter) {
    this.drawingEngine = drawingEngine;
    this.events = events;

    // Synchronize if DrawingEngine emits selection changes directly
    this.drawingEngine.on('drawing.selected', ({ drawing }) => {
      if (drawing && !this.selectedIds.has(drawing.id)) {
        this.selectedIds.clear();
        this.selectedIds.add(drawing.id);
        this.primaryId = drawing.id;
      } else if (!drawing && this.selectedIds.size === 1) {
        this.selectedIds.clear();
        this.primaryId = null;
      }
    });
  }

  public getSelectionState(): SelectionState {
    return {
      selectedIds: new Set(this.selectedIds),
      primaryId: this.primaryId,
    };
  }

  public getSelectedIds(): string[] {
    return Array.from(this.selectedIds);
  }

  public isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  /**
   * Selects a single drawing, deselecting others
   */
  public select(drawing: DrawingObject): void {
    if (this.selectedIds.size === 1 && this.selectedIds.has(drawing.id)) {
      return;
    }

    this.clearSelectionWithoutEmit();

    this.selectedIds.add(drawing.id);
    this.primaryId = drawing.id;
    this.drawingEngine.selectDrawing(drawing.id);

    this.events.emit('interaction.select', {
      drawing,
      selectedIds: this.getSelectedIds(),
    });
  }

  /**
   * Toggles selection for a drawing (Ctrl + Click multi-selection)
   */
  public toggleSelect(drawing: DrawingObject): void {
    if (this.selectedIds.has(drawing.id)) {
      this.selectedIds.delete(drawing.id);
      drawing.selected = false;
      if (this.primaryId === drawing.id) {
        this.primaryId = this.selectedIds.values().next().value ?? null;
      }
      this.events.emit('interaction.deselect', {
        selectedIds: this.getSelectedIds(),
      });
    } else {
      this.selectedIds.add(drawing.id);
      drawing.selected = true;
      this.primaryId = drawing.id;
      this.events.emit('interaction.select', {
        drawing,
        selectedIds: this.getSelectedIds(),
      });
    }
  }

  /**
   * Selects all visible drawings
   */
  public selectAll(): void {
    const drawings = this.drawingEngine.getDrawings();
    this.selectedIds.clear();

    for (const d of drawings) {
      if (d.visible) {
        this.selectedIds.add(d.id);
        d.selected = true;
      }
    }

    this.primaryId = drawings[0]?.id ?? null;

    if (this.primaryId) {
      const primaryDrawing = this.drawingEngine.getDrawing(this.primaryId);
      if (primaryDrawing) {
        this.events.emit('interaction.select', {
          drawing: primaryDrawing,
          selectedIds: this.getSelectedIds(),
        });
      }
    }
  }

  /**
   * Clears selection
   */
  public clearSelection(): void {
    if (this.selectedIds.size === 0) return;

    this.clearSelectionWithoutEmit();
    this.events.emit('interaction.deselect', {
      selectedIds: [],
    });
  }

  private clearSelectionWithoutEmit(): void {
    for (const id of this.selectedIds) {
      const d = this.drawingEngine.getDrawing(id);
      if (d) d.selected = false;
    }
    this.selectedIds.clear();
    this.primaryId = null;
    this.drawingEngine.clearSelection();
  }
}
