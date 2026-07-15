# TradeFlow Platform Architecture

TradeFlow is designed with a highly modular, decoupled architecture suitable for institutional financial platforms.

## System Layout

```
tradeflow/
│
├── apps/
│   ├── web/                     # React + Vite single-page frontend application
│   └── api/                     # Express API backend server (health & mock trade service)
│
├── packages/
│   ├── shared/                  # Common TypeScript interfaces & utility formatters
│   ├── ui/                      # Future shared component library (buttons, inputs, tables)
│   ├── chart-engine/            # Future standalone high-frequency chart engine
│   └── indicators/              # Future quantitative analysis library (SMA, Bollinger Bands, RSI)
│
├── docs/                        # Architectural specifications and designs
├── scripts/                     # Local setup and environment maintenance tasks
└── README.md                    # Setup and local usage guides
```

## Architectural Layers

### 1. Presentation Layer (apps/web)
The frontend is built as a single-page application using React, Vite, and Tailwind CSS. It connects to the backend API via HTTP polling and local event systems to manage active order books, market watch tickers, portfolio positions, and financial statements.

### 2. Service Layer (apps/api)
An Express API server constructed with clean architecture split into standard modules:
- **Routes**: Mapping endpoints to the controller functions.
- **Controllers**: Handling HTTP validation, calling services, and managing responses.
- **Services**: Hosting business logic (ticking algorithms, state aggregation, margin calculations).
- **Config**: Sourcing external credentials, databases, and environments.
- **Middleware**: Processing validation hooks, security permissions, and custom error catchers.

### 3. Packages Layer
- **@tradeflow/shared**: Provides centralized type safety. All order structures, side modifiers, tick definitions, and formatting utilities are shared seamlessly between frontend and backend.
- **@tradeflow/ui**: Intended for design system UI libraries.
- **@tradeflow/chart-engine**: Holds canvas wrappers and custom SVG layout controls.
- **@tradeflow/indicators**: Performs purely statistical and quantitative numerical operations.

## Database Strategy (Future)
We will mount a PostgreSQL database (using an ORM like Prisma or Drizzle) to persist orders, journal logs, and user credentials securely. Realtime socket streaming (WebSockets) will eventually replace polling for high-frequency updates.
