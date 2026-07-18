# System Architecture: TradeFlow

TradeFlow is organized as a pnpm workspace monorepo consisting of dedicated application modules (`apps/*`) and modular core packages (`packages/*`).

```
                                  +------------------+
                                  |    apps/web      |
                                  |  (React/Vite)    |
                                  +--------+---------+
                                           | HTTP / API
                                           v
                                  +------------------+
                                  |    apps/api      |
                                  | (Express Server) |
                                  +--------+---------+
                                           |
                    +----------------------+----------------------+
                    |                      |                      |
                    v                      v                      v
          +-------------------+  +-------------------+  +-------------------+
          |  @tradeflow/ui    |  | @tradeflow/shared |  |@tradeflow/broker  |
          |  (Design System)  |  |  (Domain Models)  |  | (Execution Adap)  |
          +-------------------+  +-------------------+  +-------------------+
```

## Monorepo Layout

- **`apps/web`**: Single Page Application (SPA) built with React 19, Vite, and Tailwind CSS.
- **`apps/api`**: Node.js/Express.js backend server structured around Clean Architecture.
- **`packages/*`**: Self-contained library modules:
  - `shared`: Domain models, types, enums, and common helpers.
  - `ui`: Reusable UI elements and styling modules.
  - `chart-engine`: Custom high-frequency chart drawing components.
  - `indicators`: Technical mathematical indicator algorithms (RSI, MACD, etc.).
  - `market-data`: Connectors and data provider abstractions.
  - `broker`: Broker execution adapters and order management interfaces.
  - `backtesting`: Historial bar/tick replay engine.
  - `strategy-engine`: Automated strategy managers.
  - `alerts`: Signal monitoring and alerting tools.
  - `storage`: Database drivers, cache stores, and file writers.
  - `authentication`: User authorization, session handlers, and tokens.
  - `ai`: Intelligent workflows and model handlers (e.g. Gemini API).

## Backend Clean Architecture Layers

Inside `apps/api/src`, we strictly separate concerns into:

1. **Domain Layer (`src/domain`)**: Core business abstractions, entity models, and interface contracts. Contains no references to web servers or external databases.
2. **Application Layer (`src/application`)**: Pure business use-cases orchestrating data flows from ports and drivers. Completely decoupled from specific web/database frameworks.
3. **Infrastructure Layer (`src/infrastructure`)**: Framework-specific adapters (Express, Database, OS) implementing domain interfaces. Includes logging, environment parsing, and dependency injection services.
4. **Interfaces Layer (`src/interfaces`)**: Entry points for system interactions, including Express routes, controllers, and middlewares.
