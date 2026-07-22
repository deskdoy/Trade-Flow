# @tradeflow/core

The **Core Package** provides foundational, framework-agnostic architectural primitives and infrastructure utilities for the TradeFlow platform.

---

## Purpose & Scope

`@tradeflow/core` provides:
- **`EventBus`**: High-performance, strongly typed event publish-subscribe utility.
- **`PluginManager`**: Generic plugin registry and lifecycle coordinator.
- **`Lifecycle`**: Standardized `Initializable`, `Disposable`, and `Lifecycle` contracts.

---

## Public API

```typescript
import { EventBus, PluginManager, Disposable } from '@tradeflow/core';

// EventBus
const bus = new EventBus();
const unsubscribe = bus.on('market.tick', (data) => console.log(data));
bus.emit('market.tick', { symbol: 'BTCUSDT', price: 95000 });

// PluginManager
const pluginMgr = new PluginManager();
pluginMgr.register({ id: 'my-plugin', name: 'My Plugin' });
```
