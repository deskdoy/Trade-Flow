# @tradeflow/replay-engine

Framework-independent replay orchestration engine for TradeFlow. It simulates historical markets in real time without duplicating business logic from existing TradeFlow engines.

## Features

- **ReplayClock**: Manages simulated playback time based strictly on dataset timestamps.
- **ReplayDataset**: Holds immutable historical candles with deterministic hashing.
- **ReplayController**: High-performance playback ticker with play, pause, resume, step, seek, fast-forward, and rewind.
- **ReplaySynchronizer**: Distributes replay candles seamlessly to Market Data Engine, Chart Engine, Indicator Engine, Strategy Engine, Paper Trading Engine, and Portfolio Engine.
- **ReplayNavigator**: Supports navigation to start, end, specific dates/indices, and trade events.
- **ReplayBuffer**: Rolling history buffer for efficient step-back and rewind capabilities.
- **ReplaySnapshot**: Complete snapshot export and restoration implementing `SnapshotProvider`.
- **Engine Standard Compliance**: Implements `EngineLifecycle`, `EngineHealth`, and `SnapshotProvider`.

## Usage

```ts
import { ReplayEngine } from '@tradeflow/replay-engine';

const engine = new ReplayEngine({ speed: 1 });
engine.loadDataset(candles);
engine.play();
```
