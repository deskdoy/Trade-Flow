# @tradeflow/workspace-engine

The **Workspace Engine** is TradeFlow's central persistence, validation, migration, and workspace coordination module.

It is responsible for saving, loading, importing, exporting, versioning, migrating, and validating complete user workspaces while stripping transient UI states.

---

## Architecture & Responsibilities

- **`WorkspaceEngine`**: Primary facade providing workspace operations and event handlers.
- **`WorkspaceManager`**: Core persistence orchestrator managing CRUD, duplications, listing, and storage operations.
- **`WorkspaceRegistry`**: Lightweight index for fast metadata lookups, tag filtering, and search without parsing full payloads.
- **`SnapshotProvider`**: Generic interface for engines to register snapshot taking and restoration handlers.
- **`WorkspaceSerializer`**: Encapsulates versioned JSON envelope serialization and state sanitization.
- **`WorkspaceValidator`**: Enforces strict structural and semantic schema checks (ISO timestamps, numeric point coordinates, range boundaries, duplicate IDs, type registries).
- **`WorkspaceMigration`**: Pipeline supporting `V0 -> V1 -> V2` step-up migrations without breaking legacy workspace files.
- **`LocalStorageProvider`**: Expandable storage provider implementing `WorkspaceStorageProvider` with browser LocalStorage and memory fallback.

---

## Public API Usage

```typescript
import { WorkspaceEngine, SnapshotProvider } from '@tradeflow/workspace-engine';

const workspaceEngine = new WorkspaceEngine();

// Register SnapshotProvider
const chartSnapshotProvider: SnapshotProvider = {
  id: 'chart-engine',
  takeSnapshot: () => ({ symbol: 'BTCUSDT', timeframe: '1h' }),
  restoreSnapshot: (snap) => console.log('Restoring chart engine:', snap),
};
workspaceEngine.registerSnapshotProvider(chartSnapshotProvider);

// Save active workspace
const meta = workspaceEngine.save({
  id: 'ws_main',
  name: 'Default Trading Layout',
  description: 'Primary swing trading workspace',
  tags: ['crypto', 'btc'],
  app: { theme: 'dark', sidebarOpen: true },
  chart: {
    symbol: 'BTCUSDT',
    timeframe: '1h',
    visibleLogicalRange: { from: 0, to: 100 },
  },
  indicators: [
    { id: 'ind_1', type: 'sma', name: 'SMA (20)', visible: true, period: 20, color: '#10b981' }
  ],
  drawings: [
    {
      id: 'd_1',
      type: 'horizontal-line',
      visible: true,
      points: [{ time: '2026-01-01T00:00:00Z', price: 95000 }],
      properties: { color: '#ef4444' }
    }
  ],
  marketData: { activeProvider: 'binance', selectedMarket: 'crypto' },
});

// Search & List metadata via WorkspaceRegistry
const cryptoWorkspaces = workspaceEngine.list({ tag: 'crypto' });

// Load workspace
const loaded = workspaceEngine.load('ws_main');

// Duplicate workspace
const copy = workspaceEngine.duplicate('ws_main', 'Crypto Layout Copy');

// Export to JSON string
const jsonString = workspaceEngine.export('ws_main');

// Import from JSON string
const imported = workspaceEngine.import(jsonString);
```

---

## Event Subscriptions

```typescript
workspaceEngine.on('workspace.saved', ({ workspace }) => {
  console.log('Workspace saved:', workspace.id);
});

workspaceEngine.on('workspace.imported', ({ workspace }) => {
  console.log('Workspace imported successfully:', workspace.name);
});

workspaceEngine.on('workspace.validation.failed', ({ result }) => {
  console.error('Validation errors:', result.errors);
});
```
