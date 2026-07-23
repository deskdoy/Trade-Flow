# @tradeflow/execution-engine

The Execution Engine package for TradeFlow. It serves as the dedicated execution layer for the platform.

## Architecture & Responsibilities

The Order Management System (OMS) orchestrates order lifecycle, risk checks, and validation, but NEVER executes orders directly. Instead, the OMS sends execution requests to the Execution Engine.

The Execution Engine selects the target execution backend, handles queueing and lifecycle tracking, manages acknowledgements, and returns standardized execution results.

### Supported Execution Targets:
- **`PaperTradingTarget`**: Forwards execution into `@tradeflow/paper-trading` (`PaperTradingEngine`).
- **`ReplayTarget`**: Market replay simulator target placeholder.
- **`BacktestTarget`**: Backtesting engine target placeholder.
- **`BrokerTarget`**: Live broker connector target placeholder (e.g. Interactive Brokers, Binance, Bybit, MT5).

### Key Constraints:
- **Execution Only**: Does NOT calculate indicators, validate trading risk, calculate margin, calculate PnL, own positions, own orders, or contain UI logic.
- **Strict Execution Lifecycle**: Orders progress predictably (`QUEUED` -> `STARTED` -> `EXECUTING` -> `COMPLETED` / `FAILED` / `CANCELLED` / `TIMEOUT`).
- **Framework & Broker Independent**: Reusable decoupled architecture supporting extensible execution backends.

## Component Structure

- `core/ExecutionEngine`: Primary entry point & coordinator.
- `router/ExecutionRouter`: Selects the appropriate execution target based on request params.
- `targets/`: Execution target adapters (`PaperTradingTarget`, `ReplayTarget`, `BacktestTarget`, `BrokerTarget`).
- `queue/ExecutionQueue`: Lightweight execution queue tracking request status and lifecycle transitions.
- `acknowledgement/ExecutionAcknowledgement`: Standardized internal acknowledgement generation (`ACCEPTED`, `REJECTED`, `PENDING`, `TIMEOUT`, `FAILED`).
- `lifecycle/ExecutionLifecycle`: Request creation, timing tracking, and result packaging.
- `events/ExecutionEvents`: Typed event bus for `execution.*` lifecycle events.
- `types/`: Type definitions and DTOs.

## Execution Flow

```
OMS Request -> ExecutionEngine -> ExecutionQueue -> ExecutionRouter -> Target (e.g. PaperTradingTarget) -> Acknowledgement & Execution -> ExecutionResult & Events
```

## Supported Events

- `execution.requested`
- `execution.started`
- `execution.sent`
- `execution.acknowledged`
- `execution.completed`
- `execution.failed`
- `execution.cancelled`
