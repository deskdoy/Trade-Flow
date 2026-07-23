# @tradeflow/replay-engine

Framework-independent replay orchestration engine for TradeFlow. It simulates historical markets in real time without duplicating business logic from existing TradeFlow engines.

## Replay Architecture

The Replay Engine orchestrates deterministic historical replay using modular subsystems:

```
+-----------------------------------------------------------------------------------+
|                                   ReplayEngine                                    |
|                                                                                   |
|  +-----------------+    +---------------------+    +--------------------------+  |
|  |  ReplayDataset  |    |     ReplayClock     |    |     ReplayController     |  |
|  | (Metadata/Hash) |    |  (ReplayCursor/FSM) |    | (Deterministic Timer/FSM)|  |
|  +--------+--------+    +----------+----------+    +------------+-------------+  |
|           |                        |                            |                 |
|           +------------------------+----------------------------+                 |
|                                    |                                              |
|  +-----------------+    +----------v----------+    +--------------------------+  |
|  |  ReplayBuffer   |    | ReplaySynchronizer  |    |     ReplayNavigator      |  |
|  | (Rolling Window)|    | (Target Plugins)    |    |   (Date / Index Seek)    |  |
|  +-----------------+    +----------+----------+    +--------------------------+  |
|                                    |                                              |
+------------------------------------+----------------------------------------------+
                                     |
             +-----------------------+-----------------------+
             |                       |                       |
     +-------v------+        +-------v------+        +-------v------+
     | Target: Chart|        |Target: Strategy|      | Target: Custom|
     +--------------+        +--------------+        +--------------+
```

## Replay Pipeline

1. **Dataset Ingestion**: Raw historical candles are validated by `ReplayValidator` and ingested into `ReplayDataset` with metadata (`datasetHash`, `symbol`, `timeframe`, `datasetSource`, `datasetVersion`).
2. **Clock & FSM Control**: `ReplayController` drives state transitions (`IDLE` -> `LOADED` -> `PLAYING` -> `PAUSED` -> `COMPLETED`) and triggers timer ticks according to the configured `ReplaySpeed` (`0.25x`, `1x`, `2x`, `4x`, `8x`, `16x`, `32x`, `MAX`).
3. **Synchronization**: On each tick, `ReplaySynchronizer` fans out the candle, history range, and dataset hash to registered `ReplaySynchronizationTarget` plugins.
4. **State & Diagnostics**: `ReplayCursor`, `ReplaySession`, and `ReplayStatistics` track progress, step counters, state durations, and buffer memory usage incrementally.

## Replay State Machine

`ReplayController` enforces a deterministic finite state machine (FSM):

- **Allowed States**: `IDLE`, `LOADED`, `PLAYING`, `PAUSED`, `COMPLETED`, `STOPPED`, `FAILED`, `ERROR`.
- **Legal Transitions**:
  - `IDLE` -> `LOADED`, `ERROR`
  - `LOADED` -> `PLAYING`, `STOPPED`, `IDLE`, `ERROR`
  - `PLAYING` -> `PAUSED`, `COMPLETED`, `STOPPED`, `ERROR`, `PLAYING`
  - `PAUSED` -> `PLAYING`, `STOPPED`, `LOADED`, `ERROR`
  - `COMPLETED` -> `PLAYING`, `LOADED`, `STOPPED`, `IDLE`, `ERROR`
  - `STOPPED` -> `LOADED`, `PLAYING`, `IDLE`, `ERROR`
  - `FAILED` / `ERROR` -> `IDLE`, `LOADED`, `STOPPED`

Attempting illegal transitions returns a structured validation result `{ valid: false, error: "..." }` without mutating state.

## Replay Synchronization Plugins

`ReplaySynchronizer` uses a plugin architecture decoupled from specific engine implementations via the `ReplaySynchronizationTarget` interface:

```ts
export interface ReplaySynchronizationTarget {
  name: string;
  synchronize(candle: Candle, index: number, history: Candle[], datasetHash: string): void;
  reset?(): void;
}
```

Target Management APIs:
- `registerTarget(target: ReplaySynchronizationTarget): void`
- `unregisterTarget(name: string): void`
- `listTargets(): string[]`

Backward-compatible adapter methods (`registerChartEngine`, `registerStrategyEngine`, etc.) internally register compliant target plugins.

## Replay Cursor

`ReplayCursor` is the immutable single source of truth for replay progress:

```ts
export interface ReplayCursor {
  readonly index: number;
  readonly timestamp?: string;
  readonly progressPercentage: number;
  readonly remainingCandles: number;
  readonly currentCandle?: Candle;
  readonly playbackState: ReplayPlaybackState;
  readonly playbackSpeed: ReplaySpeed | number;
}
```

Exposed via `engine.getCursor()`.

## Replay Session & Statistics

- **ReplaySession**: Tracks `sessionId`, timestamps, operation counters (`playCount`, `pauseCount`, `stepCount`, `seekCount`, `rewindCount`, `fastForwardCount`), playback speed, and dataset metadata. Exposed via `engine.getSession()`.
- **ReplayStatistics**: Updated incrementally without full recalculation. Tracks `processedCandles`, `averageReplaySpeed`, `averageStepsPerSecond`, `totalPlayDuration`, `totalPauseDuration`, and `memoryBufferUsage`. Exposed via `engine.getStatistics()`.

## Performance Characteristics

Benchmark measured on development hardware using an already in-memory dataset.

Actual throughput and performance depend on:
- CPU core performance and system memory bandwidth
- Dataset source (in-memory array vs stream)
- Validation strictness settings
- Active rolling window / buffer size
- Number and execution time of registered `ReplaySynchronizationTarget` plugins

## Snapshot Schema & Backward Compatibility

Snapshots adhere to `ReplaySnapshotData`:

```ts
export interface ReplaySnapshotData {
  version: string;
  engineVersion: string;
  schemaVersion: number;
  datasetHash: string;
  currentIndex: number;
  currentTime: string;
  speed: ReplaySpeed | number;
  state: ReplayPlaybackState;
  createdAt: string;
  updatedAt: string;
  playbackMode: ReplayPlaybackMode;
  cursor?: ReplayCursor;
  session?: ReplaySession;
  statistics?: ReplayStatistics;
  metadata?: ReplayDatasetMetadata;
}
```

Older snapshot schemas without `cursor`, `session`, `statistics`, or `metadata` restore cleanly without error.

## Engine Lifecycle & Health

Complies with TradeFlow `EngineLifecycle` and `SnapshotProvider`:
- `initialize()`
- `reset()`
- `destroy()`
- `getHealth()`: Reports health diagnostics including `datasetLoaded`, `datasetHash`, `bufferUsage`, `playbackState`, `currentSpeed`, `currentIndex`, `remainingCandles`, and `uptime`.
