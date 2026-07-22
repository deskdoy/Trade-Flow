import assert from 'node:assert';
import { DrawingEngine } from '@tradeflow/drawing-engine';
import {
  CoordinateConverter,
  DragController,
  HitTester,
  InteractionEngine,
  KeyboardController,
  SelectionController,
} from '../index.ts';

function createMockConverter(): CoordinateConverter {
  return {
    priceToY: (price: number) => 500 - price,
    yToPrice: (y: number) => 500 - y,
    timeToX: (time: string) => {
      if (time === '2026-01-01') return 100;
      if (time === '2026-01-02') return 200;
      return 150;
    },
    xToTime: (x: number) => {
      if (x <= 120) return '2026-01-01';
      return '2026-01-02';
    },
  };
}

function runTests() {
  console.log('Running Interaction Engine Unit Tests...');

  // 1. HitTester Test
  {
    const drawingEngine = new DrawingEngine();
    const hl = drawingEngine.createDrawing('horizontal-line', 'hl-1', [{ time: '2026-01-01', price: 100 }]);
    const converter = createMockConverter();
    const hitTester = new HitTester(10);

    // Y for price 100 is (500 - 100) = 400
    const hit = hitTester.test({ x: 100, y: 402 }, [hl], converter);
    assert.ok(hit);
    assert.strictEqual(hit.drawing.id, 'hl-1');
    assert.strictEqual(hit.targetType, 'body');

    // Miss test
    const miss = hitTester.test({ x: 100, y: 300 }, [hl], converter);
    assert.strictEqual(miss, null);
  }

  // 2. SelectionController Test
  {
    const drawingEngine = new DrawingEngine();
    const hl1 = drawingEngine.createDrawing('horizontal-line', 'hl-1', [{ time: '2026-01-01', price: 100 }]);
    const hl2 = drawingEngine.createDrawing('horizontal-line', 'hl-2', [{ time: '2026-01-01', price: 200 }]);

    const engine = new InteractionEngine(drawingEngine);
    engine.on('interaction.select', ({ drawing }) => {
      assert.ok(drawing);
    });

    // Select single
    drawingEngine.selectDrawing('hl-1');
    assert.strictEqual(engine.getSelectionState().primaryId, 'hl-1');

    // Select all
    engine.selectAll();
    assert.strictEqual(engine.getSelectionState().selectedIds.size, 2);

    // Clear
    engine.clearSelection();
    assert.strictEqual(engine.getSelectionState().selectedIds.size, 0);
  }

  // 3. DragController Test
  {
    const drawingEngine = new DrawingEngine();
    const hl = drawingEngine.createDrawing('horizontal-line', 'hl-drag', [{ time: '2026-01-01', price: 100 }]);
    const converter = createMockConverter();
    const engine = new InteractionEngine(drawingEngine);

    let dragMoved = false;
    engine.on('interaction.drag.move', () => {
      dragMoved = true;
    });

    // Price 100 -> y = 400. Start drag at y=400, move to y=350 (price 150)
    drawingEngine.selectDrawing('hl-drag');
    const dragCtrl = (engine as any).dragController as DragController;
    dragCtrl.startDrag(hl, 'body', { x: 100, y: 400 });
    dragCtrl.moveDrag({ x: 100, y: 350 }, converter);
    dragCtrl.endDrag();

    assert.ok(dragMoved);
    assert.strictEqual((hl.points[0]?.price), 150);
  }

  // 4. Keyboard Shortcuts Test
  {
    const drawingEngine = new DrawingEngine();
    drawingEngine.createDrawing('horizontal-line', 'hl-del', [{ time: '2026-01-01', price: 100 }]);
    const engine = new InteractionEngine(drawingEngine);

    engine.selectAll();
    assert.strictEqual(drawingEngine.getDrawings().length, 1);

    // Delete selected
    engine.deleteSelected();
    assert.strictEqual(drawingEngine.getDrawings().length, 0);
  }

  console.log('All Interaction Engine tests passed successfully!');
}

runTests();
