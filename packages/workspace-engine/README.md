# @tradeflow/workspace-engine

The **Workspace Engine** is TradeFlow's persistence and workspace management system.

It is responsible for saving, loading, importing, exporting, versioning, migrating, and validating complete user workspaces.

---

## Key Responsibilities

- **`WorkspaceEngine`**: Core facade for high-level workspace operations.
- **`WorkspaceManager`**: Manages persistence CRUD, duplications, listing, importing, and exporting.
- **`WorkspaceSerializer`**: Encapsulates versioned JSON envelope serialization.
- **`WorkspaceValidator`**: Validates schema compliance, type correctness, duplicate IDs, and corruption.
- **`WorkspaceMigration`**: Step-up migration pipeline (`V1 -> V2 -> ...`).
- **`LocalStorageProvider`**: Abstract storage implementation powered by browser LocalStorage with memory fallback.

---

## Public API Usage

```typescript
import { WorkspaceEngine } from '@tradeflow/workspace-engine';

const workspaceEngine = new WorkspaceEngine();

// Save active workspace
const meta = workspaceEngine.save({
  id: 'ws_main',
  name: 'Default Trading Layout',
  app: { theme: 'dark', sidebarOpen: true },
  chart: { symbol: 'BTCUSDT', timeframe: '1h' },
  indicators: [
    { id: 'ind_1', type: 'sma', name: 'SMA (20)', visible: true, period: 20, color: '#10b981' }
  ],
  drawings: [
    { id: 'd_1', type: 'horizontal-line', visible: true, points: [{ time: '2026-01-01', price: 95000 }], properties: { color: '#ef4444' } }
  ],
  marketData: { activeProvider: 'binance', selectedMarket: 'crypto' },
});

// Load workspace
const loaded = workspaceEngine.load('ws_main');

// Duplicate workspace
const copy = workspaceEngine.duplicate('ws_main', 'Crypto Layout Copy');

// Export to JSON string
const jsonString = workspaceEngine.export('ws_main');

// Import from JSON string
const imported = workspaceEngine.import(jsonString);

// List all saved workspace metadata
const allWorkspaces = workspaceEngine.list();
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
