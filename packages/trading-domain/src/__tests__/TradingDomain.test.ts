import assert from 'node:assert';
import {
  AccountModel,
  BalanceModel,
  MarginMode,
  OrderModel,
  OrderSide,
  OrderStatus,
  OrderStateMachine,
  OrderType,
  OrderValidator,
  PositionLifecycle,
  PositionModel,
  PositionSide,
  PositionValidator,
  SymbolModel,
  SymbolValidator,
  TimeInForce,
  TradeModel,
  TradingEventEmitter,
} from '../index.ts';

function runTradingDomainTests() {
  console.log('Running Trading Domain Unit Tests...');

  // 1. Models Instantiation and JSON serialization
  {
    const symbol = new SymbolModel({
      id: 'BTCUSDT',
      baseAsset: 'BTC',
      quoteAsset: 'USDT',
      pricePrecision: 2,
      quantityPrecision: 4,
      minQuantity: 0.0001,
      maxQuantity: 100,
      stepSize: 0.0001,
      minNotional: 10,
      status: 'TRADING',
    });

    assert.strictEqual(symbol.formatPrice(95123.456), 95123.46);
    assert.strictEqual(symbol.formatQuantity(1.23456), 1.2346);

    const balance = new BalanceModel({
      asset: 'USDT',
      free: 1000,
      locked: 200,
      total: 1200,
    });
    assert.strictEqual(balance.total, 1200);

    const lockedBal = balance.lock(100);
    assert.strictEqual(lockedBal.free, 900);
    assert.strictEqual(lockedBal.locked, 300);

    const account = new AccountModel({
      id: 'acc_1',
      accountType: 'SPOT',
      marginMode: MarginMode.CROSS,
      balances: [balance.toJSON()],
      canTrade: true,
      updatedAt: new Date().toISOString(),
    });
    assert.strictEqual(account.getBalance('USDT')?.free, 1000);
  }

  // 2. Order Validator Tests
  {
    const validator = new OrderValidator();

    // Valid Limit Order
    const validResult = validator.validate({
      symbol: 'BTCUSDT',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      quantity: 0.5,
      price: 90000,
      timeInForce: TimeInForce.GTC,
    });
    assert.strictEqual(validResult.valid, true);
    assert.strictEqual(validResult.errors.length, 0);

    // Invalid Limit Order (missing price)
    const invalidResult = validator.validate({
      symbol: 'BTCUSDT',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      quantity: 0.5,
    });
    assert.strictEqual(invalidResult.valid, false);
    assert.ok(invalidResult.errors.some((e) => e.field === 'price'));

    // Symbol Config Constraints Check
    const symbolConfig = new SymbolModel({
      id: 'BTCUSDT',
      baseAsset: 'BTC',
      quoteAsset: 'USDT',
      pricePrecision: 2,
      quantityPrecision: 4,
      minQuantity: 0.01,
      maxQuantity: 10,
      stepSize: 0.01,
      minNotional: 100,
      status: 'TRADING',
    });

    const tooSmallResult = validator.validate(
      {
        symbol: 'BTCUSDT',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: 0.001, // Below minQuantity 0.01
        price: 90000,
      },
      symbolConfig
    );
    assert.strictEqual(tooSmallResult.valid, false);
    assert.ok(tooSmallResult.errors.some((e) => e.field === 'quantity'));
  }

  // 3. Position Validator & Symbol Validator
  {
    const posVal = new PositionValidator();
    const validPos = posVal.validate({
      id: 'pos_1',
      symbol: 'BTCUSDT',
      side: PositionSide.LONG,
      quantity: 1,
      entryPrice: 90000,
      leverage: 10,
      marginMode: MarginMode.CROSS,
    });
    assert.strictEqual(validPos.valid, true);

    const invalidPos = posVal.validate({
      id: 'pos_1',
      symbol: 'BTCUSDT',
      side: PositionSide.LONG,
      quantity: -1,
      entryPrice: 90000,
      leverage: 0,
    });
    assert.strictEqual(invalidPos.valid, false);
    assert.strictEqual(invalidPos.errors.length, 2);

    const symVal = new SymbolValidator();
    const validSym = symVal.validate({
      id: 'ETHUSDT',
      baseAsset: 'ETH',
      quoteAsset: 'USDT',
      pricePrecision: 2,
      quantityPrecision: 3,
      minQuantity: 0.01,
      maxQuantity: 1000,
      stepSize: 0.01,
      minNotional: 10,
      status: 'TRADING',
    });
    assert.strictEqual(validSym.valid, true);
  }

  // 4. OrderStateMachine Transitions
  {
    const stateMachine = new OrderStateMachine();

    const initialOrder = new OrderModel({
      id: 'ord_1',
      symbol: 'BTCUSDT',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      status: OrderStatus.NEW,
      quantity: 1,
      filledQuantity: 0,
      price: 90000,
      timeInForce: TimeInForce.GTC,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).toJSON();

    // Valid: NEW -> PENDING -> FILLED -> CLOSED
    const pending = stateMachine.transition(initialOrder, OrderStatus.PENDING);
    assert.strictEqual(pending.status, OrderStatus.PENDING);

    const filled = stateMachine.transition(pending, OrderStatus.FILLED);
    assert.strictEqual(filled.status, OrderStatus.FILLED);

    const closed = stateMachine.transition(filled, OrderStatus.CLOSED);
    assert.strictEqual(closed.status, OrderStatus.CLOSED);
    assert.ok(stateMachine.isTerminal(closed.status));

    // Invalid Transition: CLOSED -> PENDING
    assert.throws(() => {
      stateMachine.transition(closed, OrderStatus.PENDING);
    }, /Invalid order state transition/);
  }

  // 5. PositionLifecycle Behavior
  {
    const lifecycle = new PositionLifecycle();

    // Open LONG position
    const longPos = lifecycle.openPosition({
      id: 'pos_long_1',
      symbol: 'BTCUSDT',
      side: PositionSide.LONG,
      quantity: 1,
      entryPrice: 90000,
      leverage: 5,
    });

    assert.strictEqual(longPos.quantity, 1);
    assert.strictEqual(longPos.isOpen, true);

    // Update Mark Price -> Check Unrealized PnL
    const markPos = lifecycle.updateMarkPrice(longPos, 95000);
    assert.strictEqual(markPos.unrealizedPnl, 5000); // (95000 - 90000) * 1

    // Scale up LONG position
    const { updatedPosition: scaledPos } = lifecycle.updatePosition(longPos, 1, 100000, OrderSide.BUY);
    assert.strictEqual(scaledPos.quantity, 2);
    assert.strictEqual(scaledPos.entryPrice, 95000); // Avg price of 90000 & 100000

    // Partial close LONG position
    const { updatedPosition: partialPos, realizedPnl } = lifecycle.updatePosition(
      scaledPos,
      1,
      105000,
      OrderSide.SELL
    );
    assert.strictEqual(partialPos.quantity, 1);
    assert.strictEqual(realizedPnl, 10000); // (105000 - 95000) * 1

    // Fully close position
    const { closedPosition, realizedPnl: finalPnl } = lifecycle.closePosition(partialPos, 110000);
    assert.strictEqual(closedPosition.quantity, 0);
    assert.strictEqual(closedPosition.isOpen, false);
    assert.strictEqual(finalPnl, 15000); // (110000 - 95000) * 1
  }

  // 6. TradingEventEmitter Events
  {
    const emitter = new TradingEventEmitter();
    let eventHandled = false;

    emitter.on('order.created', ({ order }) => {
      assert.strictEqual(order.id, 'ord_evt_1');
      eventHandled = true;
    });

    emitter.emit('order.created', {
      order: {
        id: 'ord_evt_1',
        symbol: 'ETHUSDT',
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        status: OrderStatus.NEW,
        quantity: 2,
        filledQuantity: 0,
        timeInForce: TimeInForce.IOC,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    assert.strictEqual(eventHandled, true);
  }

  console.log('All Trading Domain unit tests passed successfully!');
}

runTradingDomainTests();
