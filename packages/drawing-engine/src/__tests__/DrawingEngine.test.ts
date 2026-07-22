import assert from 'node:assert';
import {
  DrawingEngine,
  DrawingRegistry,
  HorizontalLine,
  TrendLine,
  Serializer,
  HorizontalLinePlugin,
  TrendLinePlugin,
} from '../index.ts';

function runTests() {
  console.log('Running Drawing Engine Tests...');

  // 1. DrawingRegistry test
  {
    const registry = new DrawingRegistry(true);
    assert.strictEqual(registry.list().length, 2);
    assert.ok(registry.get('horizontal-line'));
    assert.ok(registry.get('trend-line'));

    const hl = registry.create('horizontal-line', 'hl-1', [{ time: '2026-01-01', price: 100 }]);
    assert.strictEqual(hl.id, 'hl-1');
    assert.strictEqual(hl.type, 'horizontal-line');
  }

  // 2. HorizontalLine object test
  {
    const hl = new HorizontalLine('hl-test', [{ time: '2026-01-01', price: 100 }]);
    assert.strictEqual(hl.price, 100);
    hl.move(10);
    assert.strictEqual(hl.price, 110);
    const serialized = hl.serialize();
    assert.strictEqual(serialized.properties.price, 110);
  }

  // 3. TrendLine object test
  {
    const tl = new TrendLine('tl-test', [
      { time: '2026-01-01', price: 100 },
      { time: '2026-01-02', price: 120 },
    ]);
    assert.strictEqual(tl.points.length, 2);
    tl.move(-5);
    assert.strictEqual(tl.points[0].price, 95);
    assert.strictEqual(tl.points[1].price, 115);
  }

  // 4. DrawingEngine lifecycle & events test
  {
    const engine = new DrawingEngine();
    let createdCount = 0;
    let selectedId: string | null = null;

    engine.on('drawing.created', () => createdCount++);
    engine.on('drawing.selected', ({ drawing }) => {
      selectedId = drawing ? drawing.id : null;
    });

    const d1 = engine.createDrawing('horizontal-line', 'd1', [{ time: '2026-01-01', price: 200 }]);
    assert.strictEqual(createdCount, 1);
    assert.strictEqual(engine.getDrawings().length, 1);

    engine.selectDrawing('d1');
    assert.strictEqual(selectedId, 'd1');
    assert.strictEqual(d1.selected, true);

    engine.moveSelected(15);
    assert.strictEqual((d1 as HorizontalLine).price, 215);

    engine.clearSelection();
    assert.strictEqual(selectedId, null);
    assert.strictEqual(d1.selected, false);
  }

  // 5. Serializer & Deserialization test
  {
    const engine = new DrawingEngine();
    engine.createDrawing('horizontal-line', 'hl-s1', [{ time: '2026-01-01', price: 300 }]);
    engine.createDrawing('trend-line', 'tl-s2', [
      { time: '2026-01-01', price: 100 },
      { time: '2026-01-02', price: 150 },
    ]);

    const serializedJson = engine.serialize();
    assert.ok(serializedJson.includes('hl-s1'));
    assert.ok(serializedJson.includes('tl-s2'));

    const engine2 = new DrawingEngine();
    engine2.deserialize(serializedJson);
    assert.strictEqual(engine2.getDrawings().length, 2);
    assert.ok(engine2.getDrawing('hl-s1'));
    assert.ok(engine2.getDrawing('tl-s2'));
  }

  console.log('All Drawing Engine tests passed successfully!');
}

runTests();
