# @tradeflow/order-management

The Order Management System (OMS) package for TradeFlow. It serves as the single entry point and orchestrator for all order operations in the platform.

## Architecture & Responsibilities

The Order Management System coordinates order lifecycle execution by connecting UI / API order requests, validating requests, routing through the Risk Engine, and dispatching to Execution Targets (e.g., Paper Trading Engine or Live Brokers).

### Key Constraints:
- **Orchestration Only**: The OMS does NOT calculate risk, execute trades internally, or contain UI logic.
- **Strict State Machine**: Order states progress predictably (`NEW` -> `PENDING` -> `APPROVED` -> `ROUTED` -> `FILLED` / `PARTIALLY_FILLED` / `CANCELLED` / `EXPIRED` / `REJECTED` / `FAILED`).
- **Framework & Broker Independent**: Reusable core engine decoupleable from specific execution targets.

## Component Structure

- `core/OrderManagementEngine`: Primary entry point & coordinator.
- `manager/OrderManager`: In-memory repository for order records.
- `routing/OrderRouter` & `ExecutionTarget`: Abstraction and routing layer for execution targets (`PaperTradingTarget`).
- `lifecycle/OrderLifecycle` & `OrderStateMachine`: State machine rules and transition validation.
- `validation/OrderRequestValidator`: Pre-execution order structure validation.
- `events/OrderEvents`: Typed event bus emitter for `oms.order.*` and `oms.position.*` events.
- `types/`: Domain DTOs and type definitions.

## Order Flow

```
User Request -> OMS -> OrderRequestValidator -> RiskEngine -> ExecutionTarget (e.g. Paper Trading) -> State Update & Events
```

## Supported Operations

- `placeOrder(request: OrderRequest)`
- `cancelOrder(orderId: string, reason?: string)`
- `modifyOrder(request: OrderModificationRequest)`
- `closePosition(params: ClosePositionParams)`
- `partialClosePosition(params: PartialCloseParams)`
- `reversePosition(params: ReversePositionParams)`
- `batchOrders(requests: OrderRequest[])`
