# Future Roadmap: TradeFlow

The following roadmap guides future Development Sprints to build upon this solid architecture.

## Sprint 3: Database & Persistence
- Provision relational database schemas (Cloud SQL/PostgreSQL) using an ORM like Drizzle.
- Implement storage adapters inside `@tradeflow/storage` mapping standard repository contracts.
- Connect the application layer use-cases to read/write order books and historic position logs directly.

## Sprint 4: Live Market Streamers
- Implement WebSocket clients inside `@tradeflow/market-data` subscribing to live brokerage tickers.
- Introduce real-time event emitters inside the application layer to stream ticks down to UI clients with minimal delay.

## Sprint 5: Strategy Engine & Alerts
- Mount indicator calculations from `@tradeflow/indicators` to auto-scan incoming live market tickers.
- Enable users to define triggers (RSI crosses, Price breakouts) and stream real-time visual alerts.
- Execute automated strategy triggers based on signal conditions.
