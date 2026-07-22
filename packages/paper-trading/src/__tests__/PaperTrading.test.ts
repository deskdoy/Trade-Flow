import {
  MarginMode,
  OrderSide,
  OrderStatus,
  OrderType,
  PositionSide,
  TimeInForce,
} from '@tradeflow/trading-domain';
import { AccountManager } from '../account/AccountManager.ts';
import { PaperTradingEngine } from '../core/PaperTradingEngine.ts';
import { FillSimulator } from '../orders/FillSimulator.ts';
import { OrderManager } from '../orders/OrderManager.ts';
import { PositionManager } from '../positions/PositionManager.ts';
import { RealizedPnL } from '../pnl/RealizedPnL.ts';
import { UnrealizedPnL } from '../pnl/UnrealizedPnL.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log('Running Paper Trading Engine Unit Tests...');

  // 1. FillSimulator Tests
  {
    const simulator = new FillSimulator();
    const buyLimitOrder = {
      id: 'ord_1',
      symbol: 'BTCUSDT',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      status: OrderStatus.PENDING,
      quantity: 1,
      filledQuantity: 0,
      price: 90000,
      timeInForce: TimeInForce.GTC,
      createdAt: '',
      updatedAt: '',
    };

    // Candle low 91000 > limit 90000 -> Should NOT fill
    const candle1 = { symbol: 'BTCUSDT', time: '1', open: 92000, high: 93000, low: 91000, close: 91500 };
    assert(!simulator.evaluate(buyLimitOrder, candle1).canFill, 'Buy Limit should not fill when low > limit price');

    // Candle low 89000 <= limit 90000 -> Should fill at 90000
    const candle2 = { symbol: 'BTCUSDT', time: '2', open: 91500, high: 92000, low: 89000, close: 89500 };
    const fillRes2 = simulator.evaluate(buyLimitOrder, candle2);
    assert(fillRes2.canFill, 'Buy Limit should fill when low <= limit price');
    assert(fillRes2.fillPrice === 90000, 'Buy Limit fill price should equal limit price');

    // Sell Limit order
    const sellLimitOrder = {
      ...buyLimitOrder,
      id: 'ord_2',
      side: OrderSide.SELL,
      price: 95000,
    };

    // Candle high 94000 < limit 95000 -> Should NOT fill
    assert(!simulator.evaluate(sellLimitOrder, candle1).canFill, 'Sell Limit should not fill when high < limit price');

    // Candle high 96000 >= limit 95000 -> Should fill at 95000
    const candle3 = { symbol: 'BTCUSDT', time: '3', open: 94000, high: 96000, low: 93000, close: 95500 };
    const fillRes3 = simulator.evaluate(sellLimitOrder, candle3);
    assert(fillRes3.canFill, 'Sell Limit should fill when high >= limit price');
    assert(fillRes3.fillPrice === 95000, 'Sell Limit fill price should equal limit price');

    // Buy Stop order
    const buyStopOrder = {
      ...buyLimitOrder,
      id: 'ord_3',
      type: OrderType.STOP_LOSS,
      stopPrice: 95000,
      price: undefined,
    };
    const fillResStop = simulator.evaluate(buyStopOrder, candle3);
    assert(fillResStop.canFill, 'Buy Stop should fill when candle high >= stop price');
    assert(fillResStop.fillPrice === 95000, 'Buy Stop fill price should equal stop price');
  }

  // 2. PnL Calculator Tests
  {
    // Long unrealized PnL
    const longPos = {
      id: 'pos_1',
      symbol: 'BTCUSDT',
      side: PositionSide.LONG,
      quantity: 2,
      entryPrice: 90000,
      markPrice: 95000,
      isOpen: true,
      marginMode: MarginMode.CROSS,
      unrealizedPnl: 0,
      realizedPnl: 0,
      leverage: 10,
      openedAt: '',
      createdAt: '',
      updatedAt: '',
    };
    const uPnlLong = UnrealizedPnL.calculateSingle(longPos, 95000);
    assert(uPnlLong === 10000, `Long unrealized PnL should be 10000, got ${uPnlLong}`);

    // Short unrealized PnL
    const shortPos = { ...longPos, side: PositionSide.SHORT };
    const uPnlShort = UnrealizedPnL.calculateSingle(shortPos, 88000);
    assert(uPnlShort === 4000, `Short unrealized PnL should be 4000, got ${uPnlShort}`);

    // Realized PnL
    const rPnlLong = RealizedPnL.calculate(PositionSide.LONG, 90000, 95000, 2);
    assert(rPnlLong === 10000, `Long realized PnL should be 10000, got ${rPnlLong}`);

    const rPnlShort = RealizedPnL.calculate(PositionSide.SHORT, 90000, 85000, 2);
    assert(rPnlShort === 10000, `Short realized PnL should be 10000, got ${rPnlShort}`);
  }

  // 3. AccountManager Tests
  {
    const accManager = new AccountManager({ initialBalance: 10000, currency: 'USDT' });
    let state = accManager.getAccountState();
    assert(state.balance === 10000, 'Initial balance should be 10000');
    assert(state.equity === 10000, 'Initial equity should be 10000');
    assert(state.freeMargin === 10000, 'Initial free margin should be 10000');

    accManager.deposit(5000);
    state = accManager.getAccountState();
    assert(state.balance === 15000, 'Balance after deposit should be 15000');

    accManager.withdraw(2000);
    state = accManager.getAccountState();
    assert(state.balance === 13000, 'Balance after withdrawal should be 13000');
  }

  // 4. PositionManager Tests
  {
    const posManager = new PositionManager();
    const trade1 = {
      id: 'trd_1',
      orderId: 'ord_1',
      symbol: 'BTCUSDT',
      side: OrderSide.BUY,
      price: 90000,
      quantity: 1,
      fee: 0,
      feeAsset: 'USDT',
      timestamp: new Date().toISOString(),
    };

    const res1 = posManager.processTrade(trade1, 10, MarginMode.CROSS);
    assert(res1.isNew, 'First trade should open a new position');
    assert(res1.position.quantity === 1, 'Position quantity should be 1');
    assert(res1.position.side === PositionSide.LONG, 'Position side should be LONG');

    // Sell to close
    const trade2 = {
      ...trade1,
      id: 'trd_2',
      side: OrderSide.SELL,
      price: 94000,
    };
    const res2 = posManager.processTrade(trade2, 10, MarginMode.CROSS);
    assert(res2.isClosed, 'Closing trade should close position');
    assert(res2.realizedPnL === 4000, `Realized PnL should be 4000, got ${res2.realizedPnL}`);
    assert(posManager.getClosedPositions().length === 1, 'Closed positions count should be 1');
  }

  // 5. PaperTradingEngine End-to-End Workflow Tests
  {
    const engine = new PaperTradingEngine({
      initialBalance: 50000,
      currency: 'USDT',
      defaultLeverage: 10,
    });

    const eventsFired: string[] = [];

    engine.on('paper.order.placed', () => eventsFired.push('placed'));
    engine.on('paper.order.filled', () => eventsFired.push('filled'));
    engine.on('paper.position.opened', () => eventsFired.push('opened'));
    engine.on('paper.position.closed', () => eventsFired.push('closed'));
    engine.on('paper.balance.updated', () => eventsFired.push('bal_updated'));
    engine.on('paper.equity.updated', () => eventsFired.push('eq_updated'));

    // Place Buy Limit
    const order = engine.placeOrder({
      symbol: 'BTCUSDT',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      quantity: 0.5,
      price: 90000,
    });

    assert(order.status === OrderStatus.PENDING, 'Order status should be PENDING');
    assert(eventsFired.includes('placed'), 'paper.order.placed event should fire');

    // Candle low = 89500 -> Triggers fill
    engine.onCandle({
      symbol: 'BTCUSDT',
      time: '1000',
      open: 91000,
      high: 91200,
      low: 89500,
      close: 90500,
    });

    assert(eventsFired.includes('filled'), 'paper.order.filled event should fire');
    assert(eventsFired.includes('opened'), 'paper.position.opened event should fire');

    const pos = engine.getPosition('BTCUSDT');
    assert(pos !== undefined && pos.isOpen, 'Position should be open');
    assert(pos!.entryPrice === 90000, 'Entry price should be 90000');

    // Sell Limit order to close position
    engine.placeOrder({
      symbol: 'BTCUSDT',
      side: OrderSide.SELL,
      type: OrderType.LIMIT,
      quantity: 0.5,
      price: 94000,
    });

    // Candle high = 94500 -> Triggers close
    engine.onCandle({
      symbol: 'BTCUSDT',
      time: '1001',
      open: 92000,
      high: 94500,
      low: 91800,
      close: 94000,
    });

    assert(eventsFired.includes('closed'), 'paper.position.closed event should fire');
    assert(eventsFired.includes('bal_updated'), 'paper.balance.updated event should fire');

    const state = engine.getAccountState();
    // 0.5 * (94000 - 90000) = 2000 profit -> balance should be 52000
    assert(state.balance === 52000, `Account balance should be 52000, got ${state.balance}`);
  }

  console.log('All Paper Trading Engine unit tests passed successfully!');
}

runTests();
