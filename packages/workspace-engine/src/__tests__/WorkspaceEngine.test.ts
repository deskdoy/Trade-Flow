import assert from 'node:assert';
import { LocalStorageProvider, WorkspaceEngine, WorkspaceData, SnapshotProvider } from '../index.ts';

function createSampleWorkspace(id: string = 'ws_test_1'): WorkspaceData {
  return {
    id,
    name: 'Sample Workspace',
    description: 'A test workspace description',
    tags: ['crypto', 'eth'],
    app: { theme: 'dark', sidebarOpen: true },
    chart: {
      symbol: 'ETHUSDT',
      timeframe: '15m',
      visibleLogicalRange: { from: 0, to: 100 },
    },
    indicators: [
      { id: 'ind_1', type: 'sma', name: 'SMA (20)', visible: true, period: 20 },
    ],
    drawings: [
      {
        id: 'drw_1',
        type: 'horizontal-line',
        visible: true,
        points: [{ time: '2026-01-01T00:00:00Z', price: 3200 }],
        properties: { color: '#10b981' },
      },
    ],
    marketData: { activeProvider: 'binance', selectedMarket: 'crypto' },
  };
}

function runTests() {
  console.log('Running Refined Workspace Engine Unit Tests...');

  // 1. Basic Save & Load and Transient State Stripping
  {
    const storage = new LocalStorageProvider('test_ws_');
    const engine = new WorkspaceEngine(storage);

    const sample = createSampleWorkspace('ws_1');
    // Inject transient UI state into drawing
    (sample.drawings[0] as any).selected = true;
    (sample.drawings[0] as any).hovered = true;

    engine.save(sample);

    const loaded = engine.load('ws_1');
    assert.strictEqual(loaded.id, 'ws_1');
    assert.strictEqual(loaded.chart.symbol, 'ETHUSDT');
    assert.strictEqual(loaded.drawings.length, 1);
    // Verify transient state was removed!
    assert.strictEqual((loaded.drawings[0] as any).selected, undefined);
    assert.strictEqual((loaded.drawings[0] as any).hovered, undefined);
  }

  // 2. Workspace Storage Exists check
  {
    const storage = new LocalStorageProvider('test_ws_');
    const engine = new WorkspaceEngine(storage);

    const sample = createSampleWorkspace('ws_exists_test');
    engine.save(sample);

    assert.ok(engine.exists('ws_exists_test'));
    assert.strictEqual(engine.exists('non_existent_ws'), false);
  }

  // 3. WorkspaceRegistry Lightweight Lookup and Search/Tag Filtering
  {
    const storage = new LocalStorageProvider('test_ws_');
    const engine = new WorkspaceEngine(storage);

    const sample1 = createSampleWorkspace('ws_reg_1');
    sample1.name = 'Crypto Alpha';
    sample1.tags = ['crypto', 'btc'];

    const sample2 = createSampleWorkspace('ws_reg_2');
    sample2.name = 'Forex Major';
    sample2.tags = ['forex', 'eurusd'];

    engine.save(sample1);
    engine.save(sample2);

    const registry = engine.getRegistry();
    assert.ok(registry.has('ws_reg_1'));
    assert.ok(registry.has('ws_reg_2'));

    const cryptoWorkspaces = registry.list({ tag: 'crypto' });
    assert.strictEqual(cryptoWorkspaces.length, 1);
    assert.strictEqual(cryptoWorkspaces[0].id, 'ws_reg_1');

    const searchResult = registry.list({ search: 'forex' });
    assert.strictEqual(searchResult.length, 1);
    assert.strictEqual(searchResult[0].id, 'ws_reg_2');
  }

  // 4. SnapshotProvider Interface Registration
  {
    const storage = new LocalStorageProvider('test_ws_');
    const engine = new WorkspaceEngine(storage);

    let state = { currentSymbol: 'BTCUSDT' };
    const chartEngineSnapshotProvider: SnapshotProvider = {
      id: 'chart-engine-snapshot',
      takeSnapshot: () => ({ ...state }),
      restoreSnapshot: (snap: any) => {
        state = { ...snap };
      },
    };

    engine.registerSnapshotProvider(chartEngineSnapshotProvider);
    assert.ok(engine.getSnapshotProvider('chart-engine-snapshot'));

    const takenSnap = engine.getSnapshotProvider('chart-engine-snapshot')?.takeSnapshot();
    assert.deepStrictEqual(takenSnap, { currentSymbol: 'BTCUSDT' });

    engine.getSnapshotProvider('chart-engine-snapshot')?.restoreSnapshot({ currentSymbol: 'SOLUSDT' });
    assert.strictEqual(state.currentSymbol, 'SOLUSDT');
  }

  // 5. V1 to V2 Migration Test (zoomLevel -> visibleLogicalRange, metadata block)
  {
    const storage = new LocalStorageProvider('test_ws_');
    const engine = new WorkspaceEngine(storage);

    const legacyV1Payload = JSON.stringify({
      version: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      workspace: {
        id: 'ws_legacy_v1',
        name: 'Legacy V1 Workspace',
        app: { theme: 'dark', sidebarOpen: true },
        chart: { symbol: 'BTCUSDT', timeframe: '1d', zoomLevel: 5 },
        indicators: [],
        drawings: [
          {
            id: 'drw_v1',
            type: 'horizontal-line',
            selected: true,
            visible: true,
            points: [{ time: '2026-01-01T00:00:00Z', price: 95000 }],
            properties: {},
          },
        ],
        marketData: { activeProvider: 'binance', selectedMarket: 'crypto' },
      },
    });

    const imported = engine.import(legacyV1Payload);
    assert.strictEqual(imported.id, 'ws_legacy_v1');
    assert.strictEqual(imported.chart.symbol, 'BTCUSDT');
    // Check zoomLevel migrated to visibleLogicalRange
    assert.ok(imported.chart.visibleLogicalRange);
    assert.strictEqual((imported.chart as any).zoomLevel, undefined);
    // Check transient UI state removed
    assert.strictEqual((imported.drawings[0] as any).selected, undefined);
  }

  // 6. Semantic Validation Failure (Invalid Date)
  {
    const storage = new LocalStorageProvider('test_ws_');
    const engine = new WorkspaceEngine(storage);

    const invalidDatePayload = JSON.stringify({
      version: 2,
      createdAt: 'invalid-date-string',
      updatedAt: '2026-01-01T00:00:00.000Z',
      workspace: createSampleWorkspace('ws_bad_date'),
    });

    assert.throws(() => {
      engine.import(invalidDatePayload);
    });
  }

  // 7. Semantic Validation Failure (Invalid Range: from > to)
  {
    const storage = new LocalStorageProvider('test_ws_');
    const engine = new WorkspaceEngine(storage);

    const badWorkspace = createSampleWorkspace('ws_bad_range');
    badWorkspace.chart.visibleLogicalRange = { from: 100, to: 10 };

    assert.throws(() => {
      engine.save(badWorkspace);
    });
  }

  console.log('All Refined Workspace Engine unit tests passed successfully!');
}

runTests();
