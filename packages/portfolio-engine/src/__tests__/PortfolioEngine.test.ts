import { MarginMode, PositionSide } from '@tradeflow/trading-domain';
import { PortfolioEngine } from '../core/PortfolioEngine.ts';
import { PortfolioSnapshot } from '../snapshots/PortfolioSnapshot.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('Running Portfolio Engine Unit Tests...');

  // 1. Position Book & PnL Calculations
  {
    const engine = new PortfolioEngine({ initialBalance: 100000, defaultLeverage: 10 });

    engine.openPosition({
      id: 'pos_btc_1',
      symbol: 'BTCUSDT',
      side: PositionSide.LONG,
      quantity: 2,
      entryPrice: 50000,
      markPrice: 50000,
      unrealizedPnl: 0,
      realizedPnl: 0,
      marginMode: MarginMode.ISOLATED,
      leverage: 10,
      openedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOpen: true,
    });

    assert(engine.getPositions().length === 1, '1 open position should exist');

    // Update price to 55000 -> Unrealized PnL = (55000 - 50000) * 2 = +10,000
    engine.updateMarkPrice('BTCUSDT', 55000);

    const holdings = engine.getHoldings();
    assert(holdings.totalEquity === 110000, `Total equity should be 110,000, got ${holdings.totalEquity}`);

    // Close position at 55000
    const closed = engine.closePosition('pos_btc_1', 55000);
    assert(closed?.realizedPnl === 10000, 'Realized PnL should be +10,000');
    assert(engine.getPositions().length === 0, 'Open positions count should be 0');
    assert(engine.getClosedPositions().length === 1, 'Closed positions count should be 1');
  }

  // 2. Holdings & Cash Flow Operations
  {
    const engine = new PortfolioEngine({ initialBalance: 50000 });
    engine.deposit(20000);
    assert(engine.getHoldings().cashBalance === 70000, 'Cash balance should be 70,000 after deposit');

    engine.withdraw(10000);
    assert(engine.getHoldings().cashBalance === 60000, 'Cash balance should be 60,000 after withdrawal');
  }

  // 3. Performance & Statistics Metrics
  {
    const engine = new PortfolioEngine({ initialBalance: 100000 });

    // Trade 1: Win (+2000)
    engine.openPosition({
      id: 'trade_1',
      symbol: 'ETHUSDT',
      side: PositionSide.LONG,
      quantity: 10,
      entryPrice: 3000,
      markPrice: 3000,
      unrealizedPnl: 0,
      realizedPnl: 0,
      marginMode: MarginMode.ISOLATED,
      leverage: 1,
      openedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOpen: true,
    });
    engine.closePosition('trade_1', 3200);

    // Trade 2: Win (+1000)
    engine.openPosition({
      id: 'trade_2',
      symbol: 'ETHUSDT',
      side: PositionSide.LONG,
      quantity: 5,
      entryPrice: 3200,
      markPrice: 3200,
      unrealizedPnl: 0,
      realizedPnl: 0,
      marginMode: MarginMode.ISOLATED,
      leverage: 1,
      openedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOpen: true,
    });
    engine.closePosition('trade_2', 3400);

    // Trade 3: Loss (-1500)
    engine.openPosition({
      id: 'trade_3',
      symbol: 'ETHUSDT',
      side: PositionSide.LONG,
      quantity: 5,
      entryPrice: 3400,
      markPrice: 3400,
      unrealizedPnl: 0,
      realizedPnl: 0,
      marginMode: MarginMode.ISOLATED,
      leverage: 1,
      openedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOpen: true,
    });
    engine.closePosition('trade_3', 3100);

    const perf = engine.getPerformance();
    const stats = engine.getStatistics();

    assert(stats.totalTrades === 3, 'Total trades should be 3');
    assert(stats.winningTrades === 2, 'Winning trades should be 2');
    assert(stats.losingTrades === 1, 'Losing trades should be 1');
    assert(Math.round(stats.winRate) === 67, 'Win rate should be ~67%');
    assert(stats.longestWinningStreak === 2, 'Longest winning streak should be 2');
    assert(perf.grossProfit === 3000, `Gross profit should be 3000, got ${perf.grossProfit}`);
    assert(perf.grossLoss === 1500, `Gross loss should be 1500, got ${perf.grossLoss}`);
    assert(perf.netProfit === 1500, `Net profit should be 1500, got ${perf.netProfit}`);
    assert(perf.profitFactor === 2, `Profit factor should be 2.0, got ${perf.profitFactor}`);
  }

  // 4. Equity Curve & Drawdown Tracking
  {
    const engine = new PortfolioEngine({ initialBalance: 100000 });
    engine.openPosition({
      id: 'trade_drawdown',
      symbol: 'BTCUSDT',
      side: PositionSide.LONG,
      quantity: 1,
      entryPrice: 50000,
      markPrice: 50000,
      unrealizedPnl: 0,
      realizedPnl: 0,
      marginMode: MarginMode.ISOLATED,
      leverage: 1,
      openedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOpen: true,
    });

    // Price spikes up -> peak equity = 120,000
    engine.updateMarkPrice('BTCUSDT', 70000);
    let equity = engine.getEquity();
    assert(equity.peakEquity === 120000, 'Peak equity should be 120,000');

    // Price drops down to 40,000 -> equity = 90,000 (drawdown = 30,000)
    engine.updateMarkPrice('BTCUSDT', 40000);
    equity = engine.getEquity();
    assert(equity.maxDrawdown === 30000, `Max drawdown should be 30,000, got ${equity.maxDrawdown}`);
    assert(equity.maxDrawdownPercent === 25, `Max drawdown % should be 25%, got ${equity.maxDrawdownPercent}`);
  }

  // 5. Snapshot System & Restoration
  {
    const engine1 = new PortfolioEngine({ initialBalance: 100000 });
    engine1.openPosition({
      id: 'pos_snap',
      symbol: 'SOLUSDT',
      side: PositionSide.LONG,
      quantity: 100,
      entryPrice: 150,
      markPrice: 160,
      unrealizedPnl: 1000,
      realizedPnl: 0,
      marginMode: MarginMode.ISOLATED,
      leverage: 5,
      openedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOpen: true,
    });

    const snapshot = engine1.getSnapshot();
    const serialized = PortfolioSnapshot.serialize(snapshot);

    const engine2 = new PortfolioEngine({ initialBalance: 50000 });
    engine2.restoreSnapshot(serialized);

    assert(engine2.getPositions().length === 1, 'Restored engine should have 1 open position');
    assert(engine2.getPositions()[0].symbol === 'SOLUSDT', 'Restored position symbol should be SOLUSDT');
    assert(engine2.getHoldings().totalEquity === snapshot.holdings.totalEquity, 'Equity should match snapshot');
  }

  // 6. Event System Verification
  {
    const engine = new PortfolioEngine({ initialBalance: 100000 });
    let updatedFired = false;
    let openedFired = false;
    let closedFired = false;

    engine.on('portfolio.updated', () => (updatedFired = true));
    engine.on('portfolio.position.opened', () => (openedFired = true));
    engine.on('portfolio.position.closed', () => (closedFired = true));

    engine.openPosition({
      id: 'event_pos',
      symbol: 'BTCUSDT',
      side: PositionSide.LONG,
      quantity: 1,
      entryPrice: 50000,
      markPrice: 50000,
      unrealizedPnl: 0,
      realizedPnl: 0,
      marginMode: MarginMode.ISOLATED,
      leverage: 1,
      openedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOpen: true,
    });

    assert(openedFired, 'portfolio.position.opened event fired');
    assert(updatedFired, 'portfolio.updated event fired');

    engine.closePosition('event_pos', 52000);
    assert(closedFired, 'portfolio.position.closed event fired');
  }

  console.log('All Portfolio Engine unit tests passed successfully!');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
