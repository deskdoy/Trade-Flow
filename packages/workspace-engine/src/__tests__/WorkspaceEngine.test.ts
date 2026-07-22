import assert from 'node:assert';
import { LocalStorageProvider, WorkspaceEngine, WorkspaceData } from '../index.ts';

function createSampleWorkspace(id: string = 'ws_test_1'): WorkspaceData {
  return {
    id,
    name: 'Sample Workspace',
    app: { theme: 'dark', sidebarOpen: true },
    chart: { symbol: 'ETHUSDT', timeframe: '15m' },
    indicators: [
      { id: 'ind_1', type: 'sma', name: 'SMA (20)', visible: true, period: 20 },
    ],
    drawings: [
      {
        id: 'drw_1',
        type: 'horizontal-line',
        visible: true,
        points: [{ time: '2026-01-01', price: 3200 }],
        properties: { color: '#10b981' },
      },
    ],
    marketData: { activeProvider: 'binance', selectedMarket: 'crypto' },
  };
}

function runTests() {
  console.log('Running Workspace Engine Unit Tests...');

  // 1. Basic Save & Load
  {
    const storage = new LocalStorageProvider('test_ws_');
    const engine = new WorkspaceEngine(storage);

    const sample = createSampleWorkspace('ws_1');
    engine.save(sample);

    const loaded = engine.load('ws_1');
    assert.strictEqual(loaded.id, 'ws_1');
    assert.strictEqual(loaded.chart.symbol, 'ETHUSDT');
    assert.strictEqual(loaded.drawings.length, 1);
  }

  // 2. Rename Workspace
  {
    const storage = new LocalStorageProvider('test_ws_');
    const engine = new WorkspaceEngine(storage);

    const sample = createSampleWorkspace('ws_rename');
    engine.save(sample);

    engine.rename('ws_rename', 'New Name');
    const loaded = engine.load('ws_rename');
    assert.strictEqual(loaded.name, 'New Name');
  }

  // 3. Duplicate Workspace
  {
    const storage = new LocalStorageProvider('test_ws_');
    const engine = new WorkspaceEngine(storage);

    const sample = createSampleWorkspace('ws_dup_orig');
    engine.save(sample);

    const dup = engine.duplicate('ws_dup_orig', 'Duplicated WS');
    assert.notStrictEqual(dup.id, 'ws_dup_orig');
    assert.strictEqual(dup.name, 'Duplicated WS');

    const list = engine.list();
    assert.strictEqual(list.length, 2);
  }

  // 4. Delete Workspace
  {
    const storage = new LocalStorageProvider('test_ws_');
    const engine = new WorkspaceEngine(storage);

    const sample = createSampleWorkspace('ws_del');
    engine.save(sample);

    assert.ok(engine.delete('ws_del'));
    assert.throws(() => engine.load('ws_del'));
  }

  // 5. Export & Import
  {
    const storage = new LocalStorageProvider('test_ws_');
    const engine = new WorkspaceEngine(storage);

    const sample = createSampleWorkspace('ws_exp');
    engine.save(sample);

    const exportedJson = engine.export('ws_exp');
    assert.ok(typeof exportedJson === 'string');
    assert.ok(exportedJson.includes('"ETHUSDT"'));

    // Import into a new engine instance
    const storage2 = new LocalStorageProvider('test_ws_2_');
    const engine2 = new WorkspaceEngine(storage2);

    const imported = engine2.import(exportedJson);
    assert.strictEqual(imported.id, 'ws_exp');
    assert.strictEqual(imported.chart.symbol, 'ETHUSDT');
  }

  // 6. Corrupted JSON Handling
  {
    const storage = new LocalStorageProvider('test_ws_');
    const engine = new WorkspaceEngine(storage);

    assert.throws(() => {
      engine.import('{"invalid_json": true');
    });
  }

  // 7. Unknown Drawing Type Validation Failure
  {
    const storage = new LocalStorageProvider('test_ws_');
    const engine = new WorkspaceEngine(storage);

    const badWorkspace = createSampleWorkspace('ws_bad_drawing');
    badWorkspace.drawings.push({
      id: 'drw_bad',
      type: 'unknown_spaceship_drawing',
      visible: true,
      points: [],
      properties: {},
    });

    assert.throws(() => {
      engine.save(badWorkspace);
    });
  }

  // 8. Migration Test (Legacy / Unversioned Payload)
  {
    const storage = new LocalStorageProvider('test_ws_');
    const engine = new WorkspaceEngine(storage);

    const legacyPayload = JSON.stringify({
      id: 'ws_legacy',
      name: 'Old Workspace',
      chart: { symbol: 'BTCUSDT', timeframe: '1d' },
      indicators: [],
      drawings: [],
    });

    const imported = engine.import(legacyPayload);
    assert.strictEqual(imported.id, 'ws_legacy');
    assert.strictEqual(imported.chart.symbol, 'BTCUSDT');
  }

  console.log('All Workspace Engine unit tests passed successfully!');
}

runTests();
