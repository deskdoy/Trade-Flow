# @tradeflow/drawing-engine

The **Drawing Engine** is a core package in TradeFlow responsible for managing chart drawing objects, user interactions (selection, movement, destruction), state serialization, and event handling. It uses a flexible plugin architecture so new drawing tools (e.g., Ray, Fibonacci Retracement, Rectangle) can be added without modifying the engine core.

---

## Architecture Overview

The Drawing Engine is strictly decoupled from rendering libraries (like Lightweight Charts) and UI frameworks (like React).

- **`core/DrawingEngine`**: Central manager owning state, selection, event emissions, and orchestration.
- **`registry/DrawingRegistry`**: Registry for drawing plugins (`DrawingPlugin`), instantiating new objects by tool type.
- **`plugins/`**: Tool plugins implementing `DrawingPlugin` (`HorizontalLinePlugin`, `TrendLinePlugin`).
- **`objects/`**: Class implementations of `DrawingObject` (`HorizontalLine`, `TrendLine`).
- **`serialization/Serializer`**: Converts drawing instances to and from JSON formats.
- **`events/DrawingEvents`**: Strongly-typed event bus emitting creation, update, deletion, and selection events.
- **`utils/`**: Geometric and ID helper utilities.

---

## Public API

### `DrawingEngine`

```typescript
import { DrawingEngine } from '@tradeflow/drawing-engine';

const engine = new DrawingEngine();

// Create drawing
const hLine = engine.createDrawing('horizontal-line', 'hl-1', [{ time: '2026-01-01', price: 150 }]);

// Select drawing
engine.selectDrawing('hl-1');

// Move selected drawing
engine.moveSelected(2.5);

// Update properties
engine.updateDrawing('hl-1', undefined, { color: '#3b82f6', lineWidth: 3 });

// Serialize
const jsonStr = engine.serialize();

// Deserialize
engine.deserialize(jsonStr);

// Subscribe to events
engine.on('drawing.created', ({ drawing }) => console.log('Created:', drawing.id));
engine.on('drawing.selected', ({ drawing }) => console.log('Selected:', drawing?.id));
```

---

## Plugin Architecture

All drawing tools implement `DrawingPlugin`:

```typescript
export interface DrawingPlugin {
  readonly type: string;
  readonly name: string;
  createInstance(
    id: string,
    points: DrawingPoint[],
    properties?: DrawingObjectProperties
  ): DrawingObject;
}
```

To register a new tool:

```typescript
engine.registerPlugin(new CustomRectanglePlugin());
```

---

## Event Flow

The Drawing Engine emits the following typed events:

- `drawing.created`: Fired when a new drawing object is created.
- `drawing.updated`: Fired when a drawing's points, properties, or selection state change.
- `drawing.deleted`: Fired when a drawing is removed or destroyed.
- `drawing.selected`: Fired when a drawing is selected.
- `drawing.deselected`: Fired when a drawing is deselected.

---

## Serialization Format

Drawings serialize to standard JSON objects:

```json
[
  {
    "id": "hl_123",
    "type": "horizontal-line",
    "selected": false,
    "visible": true,
    "points": [{ "time": "2026-07-22", "price": 42000 }],
    "properties": {
      "color": "#ef4444",
      "lineWidth": 2,
      "lineStyle": "solid",
      "price": 42000
    }
  }
]
```
