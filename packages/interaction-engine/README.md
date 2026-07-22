# @tradeflow/interaction-engine

The **Interaction Engine** is an interaction-controller package in TradeFlow responsible for mouse/pointer tracking, selection management, handle-dragging, cursor state updates, keyboard shortcuts, and snapping.

It translates low-level user inputs into high-level drawing mutations on `@tradeflow/drawing-engine` and communicates coordinate conversions with `@tradeflow/chart-engine` via a clean `CoordinateConverter` adapter interface.

---

## Architecture Overview

- **`core/InteractionEngine`**: Main facade orchestrating all input controllers.
- **`hit-testing/HitTester`**: Converts pixel $(x, y)$ coordinates into drawing or handle hit results (`body`, `handle-0`, `handle-1`).
- **`selection/SelectionController`**: Manages single selection, Ctrl+Click multi-selection, `selectAll()`, and `clearSelection()`.
- **`dragging/DragController`**: Translates pointer move deltas into price changes for horizontal lines and endpoints for trend lines.
- **`pointer/PointerController`**: Listens to pointer down/move/up/leave events, updates canvas cursor styles, and emits hover events.
- **`keyboard/KeyboardController`**: Handles `Delete`, `Backspace`, `Escape`, and `Ctrl+A` keyboard shortcuts.
- **`events/InteractionEvents`**: Strongly-typed event emitter for interaction lifecycle events.

---

## Public API Usage

```typescript
import { DrawingEngine } from '@tradeflow/drawing-engine';
import { InteractionEngine, CoordinateConverter } from '@tradeflow/interaction-engine';

const drawingEngine = new DrawingEngine();
const interactionEngine = new InteractionEngine(drawingEngine);

// Coordinate converter adapter mapping chart coordinates
const converter: CoordinateConverter = {
  priceToY: (price) => chartInstance.priceToCoordinate(price),
  yToPrice: (y) => chartInstance.coordinateToPrice(y),
  timeToX: (time) => chartInstance.timeToCoordinate(time),
  xToTime: (x) => chartInstance.coordinateToTime(x),
};

// Attach to chart DOM container
interactionEngine.attach(chartContainerElement, converter);

// Configure price snapping
interactionEngine.setSnapping({ enabled: true, priceStep: 0.5 });

// Subscribe to events
interactionEngine.on('interaction.select', ({ drawing, selectedIds }) => {
  console.log('Selected:', drawing.id, 'Total Selected:', selectedIds);
});

interactionEngine.on('interaction.drag.move', ({ drawing, deltaPrice }) => {
  console.log('Moved drawing:', drawing.id, 'by:', deltaPrice);
});

interactionEngine.on('interaction.key.delete', ({ deletedIds }) => {
  console.log('Deleted drawings:', deletedIds);
});
```

---

## Keyboard Shortcuts

- **`Delete` / `Backspace`**: Removes currently selected drawings.
- **`Escape`**: Clears active selection.
- **`Ctrl+A` / `Cmd+A`**: Selects all visible drawings.

---

## Event List

- `interaction.hover`: Fired on pointer move over chart/drawings.
- `interaction.select`: Fired when a drawing is selected.
- `interaction.deselect`: Fired when selection is cleared or toggled.
- `interaction.drag.start`: Fired when dragging begins.
- `interaction.drag.move`: Fired during dragging motion.
- `interaction.drag.end`: Fired when dragging finishes.
- `interaction.key.delete`: Fired when drawings are deleted via keyboard.
- `interaction.key.escape`: Fired when selection is cleared via `Escape`.
- `interaction.cursor.change`: Fired when cursor state updates (`default`, `pointer`, `crosshair`, `move`, `ns-resize`).
