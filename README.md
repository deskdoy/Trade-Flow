# TradeFlow

TradeFlow is a professional-grade web-based financial trading terminal built as a modular, full-stack application. It provides an enterprise foundation designed for clean separation of concerns, high performance, and rapid quantitative expansions.

---

## Workspace Layout

```
tradeflow/
│
├── apps/
│   ├── web/               # Single-page terminal dashboard (React, Vite, Tailwind CSS)
│   └── api/               # Unified service backend gateway (Express, TypeScript)
│
├── packages/
│   ├── shared/            # Common models, TypeScript types, and number formatters
│   ├── ui/                # Standalone design-system component library
│   ├── chart-engine/      # Modular canvas charting wrappers
│   └── indicators/        # Statistical and mathematical trading indicator formulae
│
├── docs/                  # System blueprints, visual designs, and database specifications
├── scripts/               # Host shell scripts and setup recipes
├── server.ts              # Express-Vite development and production server entry point
└── package.json           # Master monorepo configurations and tasks
```

---

## Technical Architecture Overview

- **Core Engine Server (`server.ts`)**: Integrates our backend API router (`apps/api`) into Vite's asset compilation middleware. Port 3000 serves both our REST endpoints and the modular frontend code in a unified thread, making deployment seamless and secure.
- **In-Memory Ticking Engine (`TradingService`)**: Implements random walks to generate lifelike market fluctuations. It manages virtual equity, margin thresholds, leverage calculations, and handles buys/sells in real time.
- **Responsive Workspace Dashboard**: Employs structural panels optimized for high-density trade feeds:
  - **Top Navigation Bar**: Tracks balance metrics and margin cushions.
  - **Left Sidebar**: Offers rapid space navigation between active tabs.
  - **Interactive Chart Placeholder**: Implements crosshairs, interval switching, indicator tags, and coordinate projections.
  - **Dynamic Depth Book**: Color-codes and visualizes bid/ask spreads.
  - **Integrated Order Form**: Processes limit and market orders immediately.
  - **Active Tab Matrices**: Supports cancelling pending limit orders and tracking completed history logs.

---

## Getting Started

### Prerequisites

- **Node.js** (v18.0 or higher)
- **NPM** or **PNPM**

### Setup Environment

1. Install dependencies from the project root:
   ```bash
   npm install
   ```

2. Provision the environment configuration:
   ```bash
   cp .env.example .env
   ```

### Running the Application

To boot up the combined API server and React frontend in development mode on port `3000`:
```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

To build the optimized static asset bundles and bundle the Node.js Express server into a standalone executable:
```bash
npm run build
```

To run the compiled production bundle:
```bash
npm run start
```
