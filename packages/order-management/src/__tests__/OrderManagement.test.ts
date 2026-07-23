import { OrderSide, OrderType } from '@tradeflow/trading-domain';
import { PaperTradingEngine } from '@tradeflow/paper-trading';
import { RiskEngine } from '@tradeflow/risk-engine';
import { OrderManagementEngine } from '../core/OrderManagementEngine.ts';
import { OrderStateMachine } from '../lifecycle/OrderStateMachine.ts';
import { OrderManager } from '../manager/OrderManager.ts';
import { PaperTradingTarget } from '../routing/ExecutionTarget.ts';
import { OrderRouter } from '../routing/OrderRouter.ts';
import { OMSOrderState } from '../types/index.ts';
import { OrderRequestValidator } from '../validation/OrderRequestValidator.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log('Running Order Management System (OMS) Unit Tests...');

  // 1. Order State Machine Tests
  {
    assert(OrderStateMachine.canTransition(OMSOrderState.NEW, OMSOrderState.PENDING), 'NEW -> PENDING should be allowed');
    assert(OrderStateMachine.canTransition(OMSOrderState.PENDING, OMSOrderState.APPROVED), 'PENDING -> APPROVED should be allowed');
    assert(OrderStateMachine.canTransition(OMSOrderState.APPROVED, OMSOrderState.ROUTED), 'APPROVED -> ROUTED should be allowed');
    assert(OrderStateMachine.canTransition(OMSOrderState.ROUTED, OMSOrderState.FILLED), 'ROUTED -> FILLED should be allowed');

    assert(!OrderStateMachine.canTransition(OMSOrderState.FILLED, OMSOrderState.PENDING), 'FILLED -> PENDING should be rejected');
    assert(!OrderStateMachine.canTransition(OMSOrderState.CANCELLED, OMSOrderState.ROUTED), 'CANCELLED -> ROUTED should be rejected');

    assert(OrderStateMachine.isTerminalState(OMSOrderState.FILLED), 'FILLED should be terminal');
    assert(OrderStateMachine.isCancellableState(OMSOrderState.ROUTED), 'ROUTED should be cancellable');
  }

  // 2. Order Request Validator Tests
  {
    const validator = new OrderRequestValidator();

    const validRes = validator.validate({
      symbol: 'BTCUSDT',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      quantity: 1,
      price: 90000,
    });
    assert(validRes.approved === true, 'Valid limit order should pass validation');

    const invalidRes = validator.validate({
      symbol: '',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      quantity: -1,
      price: 0,
    });
    assert(invalidRes.approved === false, 'Invalid order params should fail validation');
    assert(invalidRes.reasons.length >= 3, 'Invalid order should list multiple rejection reasons');
  }

  // 3. Order Manager Tests
  {
    const manager = new OrderManager();
    const now = new Date().toISOString();

    manager.saveOrder({
      id: 'ord_1',
      clientOrderId: 'cli_1',
      request: { symbol: 'BTCUSDT', side: OrderSide.BUY, type: OrderType.MARKET, quantity: 1 },
      state: OMSOrderState.ROUTED,
      createdAt: now,
      updatedAt: now,
    });

    const retrieved = manager.getOrder('ord_1');
    assert(retrieved?.id === 'ord_1', 'Should retrieve order by ID');

    const active = manager.getActiveOrders();
    assert(active.length === 1, 'Active orders count should be 1');
  }

  // 4. OMS Engine Workflow & Event Tests
  {
    const paperEngine = new PaperTradingEngine({
      initialBalance: 100000,
      currency: 'USDT',
    });

    const target = new PaperTradingTarget(paperEngine, 'paper-1', 'Paper Engine');
    const router = new OrderRouter();
    router.registerTarget(target);

    const riskEngine = new RiskEngine({
      maxAccountExposure: 500000,
      maxSymbolExposure: 200000,
      maxLeverage: 10,
    });

    const oms = new OrderManagementEngine(riskEngine, router);

    let createdEvents = 0;
    let validatedEvents = 0;
    let approvedEvents = 0;
    let routedEvents = 0;
    let filledEvents = 0;
    let rejectedEvents = 0;

    oms.on('oms.order.created', () => createdEvents++);
    oms.on('oms.order.validated', () => validatedEvents++);
    oms.on('oms.order.approved', () => approvedEvents++);
    oms.on('oms.order.routed', () => routedEvents++);
    oms.on('oms.order.filled', () => filledEvents++);
    oms.on('oms.order.rejected', () => rejectedEvents++);

    // Set market price in paper engine first
    paperEngine.processMarketData({ symbol: 'BTCUSDT', price: 90000 });

    // Place Market Order
    const placeResult = oms.placeOrder({
      symbol: 'BTCUSDT',
      side: OrderSide.BUY,
      type: OrderType.MARKET,
      quantity: 1,
      leverage: 10,
      targetId: 'paper-1',
    });

    assert(placeResult.success === true, 'Market order placement should succeed');
    assert(placeResult.state === OMSOrderState.FILLED, 'Market order state should be FILLED');
    assert(createdEvents === 1, 'Created event fired');
    assert(validatedEvents === 1, 'Validated event fired');
    assert(approvedEvents === 1, 'Approved event fired');
    assert(routedEvents === 1, 'Routed event fired');
    assert(filledEvents === 1, 'Filled event fired');

    // Test Rejection on Risk Limit Breach ($200,000 max symbol exposure)
    // Attempting 3 BTC at $90,000 = $270,000 exposure > $200,000 limit
    const riskRejectRes = oms.placeOrder({
      symbol: 'BTCUSDT',
      side: OrderSide.BUY,
      type: OrderType.MARKET,
      quantity: 3,
      leverage: 10,
      targetId: 'paper-1',
    });

    assert(riskRejectRes.success === false, 'Excessive quantity order should fail risk check');
    assert(riskRejectRes.state === OMSOrderState.REJECTED, 'Order state should be REJECTED');
    assert(rejectedEvents === 1, 'Rejected event fired');

    // Test Pending Limit Order Cancellation
    const limitOrderRes = oms.placeOrder({
      symbol: 'BTCUSDT',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      quantity: 0.5,
      price: 80000,
      leverage: 10,
      targetId: 'paper-1',
    });

    assert(limitOrderRes.success === true, 'Limit order placement should succeed');
    assert(limitOrderRes.state === OMSOrderState.ROUTED, 'Unfilled limit order state should be ROUTED');

    const cancelRes = oms.cancelOrder(limitOrderRes.orderId!, 'User cancelled limit order');
    assert(cancelRes.success === true, 'Limit order cancellation should succeed');
    assert(cancelRes.state === OMSOrderState.CANCELLED, 'Cancelled order state should be CANCELLED');

    // Test Position Operations: Close Position
    const closeRes = oms.closePosition({ symbol: 'BTCUSDT', targetId: 'paper-1' });
    assert(closeRes.success === true, 'Close position should succeed');

    const remainingPosition = paperEngine.getPosition('BTCUSDT');
    assert(!remainingPosition || !remainingPosition.isOpen, 'BTCUSDT position should now be closed');

    // Test Batch Orders
    const batchRes = oms.batchOrders([
      { symbol: 'BTCUSDT', side: OrderSide.BUY, type: OrderType.LIMIT, quantity: 0.1, price: 85000, targetId: 'paper-1' },
      { symbol: 'ETHUSDT', side: OrderSide.BUY, type: OrderType.LIMIT, quantity: 1, price: 3000, targetId: 'paper-1' },
    ]);

    assert(batchRes.length === 2, 'Batch orders returned 2 results');
    assert(batchRes.every((r) => r.success === true), 'All batch orders succeeded');
  }

  console.log('All Order Management System (OMS) unit tests passed successfully!');
}

runTests();
