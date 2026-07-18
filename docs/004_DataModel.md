# Data Models: TradeFlow

The core domain data models are defined inside `@tradeflow/shared` and represent entities used uniformly by the user interface, risk engines, and external brokerage interfaces.

## 1. MarketData

Represents a single asset price tick.

| Field | Type | Description |
|---|---|---|
| `symbol` | `string` | Asset pair ticker (e.g. `BTC/USD`) |
| `bid` | `number` | The highest price a buyer is willing to pay |
| `ask` | `number` | The lowest price a seller is willing to accept |
| `last` | `number` | Last traded price |
| `high` | `number` | High price over the current 24H window |
| `low` | `number` | Low price over the current 24H window |
| `volume` | `number` | Total traded volume |
| `timestamp` | `string` | ISO string of the tick's publication |

## 2. Order

Represents a buy or sell trade order.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique order identifier |
| `symbol` | `string` | Asset pair ticker |
| `price` | `number` | Execution target price |
| `quantity` | `number` | Asset amount to trade |
| `type` | `OrderType` | `LIMIT`, `MARKET`, `STOP`, `STOP_LIMIT` |
| `side` | `OrderSide` | `BUY`, `SELL` |
| `status` | `OrderStatus` | `PENDING`, `FILLED`, `CANCELLED`, `REJECTED` |
| `timestamp` | `string` | Creation ISO timestamp |

## 3. Position

Represents an actively held financial risk position.

| Field | Type | Description |
|---|---|---|
| `symbol` | `string` | Asset pair identifier |
| `averageEntryPrice` | `number` | Average purchase/entry price |
| `quantity` | `number` | Size of the active exposure |
| `marketValue` | `number` | Asset position current market value |
| `unrealizedPnl` | `number` | Uncollected profits or losses |
| `realizedPnl` | `number` | Collected profits or losses |

## 4. AccountInfo

Represents user brokerage balance metrics.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique account identifier |
| `balance` | `number` | Total cash balance of the account |
| `equity` | `number` | Account balance + Unrealized PNL |
| `marginUsed` | `number` | Active locked collateral value |
| `freeMargin` | `number` | Remaining margin available to allocate |
| `currency` | `string` | Denominated currency symbol (e.g. `USD`) |
