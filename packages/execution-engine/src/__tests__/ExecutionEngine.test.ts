import { OrderSide, OrderStatus, OrderType } from '@tradeflow/trading-domain';
import { PaperTradingEngine } from '@tradeflow/paper-trading';
import { ExecutionAcknowledgement } from '../acknowledgement/ExecutionAcknowledgement.ts';
import { ExecutionEngine } from '../core/ExecutionEngine.ts';
import { ExecutionQueue } from '../queue/ExecutionQueue.ts';
import { ExecutionRouter } from '../router/ExecutionRouter.ts';
import { BacktestTarget } from '../targets/BacktestTarget.ts';
import { BrokerTarget } from '../targets/BrokerTarget.ts';
import { PaperTradingTarget } from '../targets/PaperTradingTarget.ts';
import { ReplayTarget } from '../targets/ReplayTarget.ts';
import { AcknowledgementStatus, ExecutionStatus } from '../types/index.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('Running Execution Engine Unit Tests...');

  // 1. Target Registration & Execution Router Tests
  {
    const router = new ExecutionRouter();
    const paperEngine = new PaperTradingEngine({ initialBalance: 50000 });
    const paperTarget = new PaperTradingTarget(paperEngine, 'paper-1');
    const replayTarget = new ReplayTarget('replay-1');
    const backtestTarget = new BacktestTarget('backtest-1');
    const brokerTarget = new BrokerTarget('broker-1');

    router.registerTarget(paperTarget);
    router.registerTarget(replayTarget);
    router.registerTarget(backtestTarget);
    router.registerTarget(brokerTarget);

    assert(router.listTargets().length === 4, '4 targets should be registered');
    assert(router.getTarget('paper-1').id === 'paper-1', 'Should retrieve paper-1 target');

    const selectedPaper = router.selectTarget({
      requestId: 'req_1',
      orderRequest: { symbol: 'BTCUSDT', side: OrderSide.BUY, type: OrderType.MARKET, quantity: 1 },
      targetId: 'paper-1',
      timestamp: new Date().toISOString(),
    });
    assert(selectedPaper.id === 'paper-1', 'Direct target ID selection should return paper-1');

    const selectedReplay = router.selectTarget({
      requestId: 'req_2',
      orderRequest: { symbol: 'BTCUSDT', side: OrderSide.BUY, type: OrderType.MARKET, quantity: 1 },
      targetType: 'replay',
      timestamp: new Date().toISOString(),
    });
    assert(selectedReplay.id === 'replay-1', 'Target type selection should return replay-1');
  }

  // 2. Queue & Status Updates Tests
  {
    const queue = new ExecutionQueue();
    const req = {
      requestId: 'req_queue_1',
      orderRequest: { symbol: 'ETHUSDT', side: OrderSide.BUY, type: OrderType.MARKET, quantity: 2 },
      timestamp: new Date().toISOString(),
    };

    queue.enqueue(req);
    assert(queue.getPendingCount() === 1, 'Pending count should be 1');

    queue.updateStatus('req_queue_1', ExecutionStatus.STARTED);
    const item = queue.getItem('req_queue_1');
    assert(item?.status === ExecutionStatus.STARTED, 'Status should be updated to STARTED');
  }

  // 3. Acknowledgements Tests
  {
    const req = {
      requestId: 'req_ack_1',
      orderRequest: { symbol: 'BTCUSDT', side: OrderSide.BUY, type: OrderType.MARKET, quantity: 1 },
      timestamp: new Date().toISOString(),
    };

    const ackAccept = ExecutionAcknowledgement.accept(req, 'paper-1');
    assert(ackAccept.status === AcknowledgementStatus.ACCEPTED, 'Acknowledgement status ACCEPTED');

    const ackReject = ExecutionAcknowledgement.reject(req, 'paper-1', ['Margin insufficient']);
    assert(ackReject.status === AcknowledgementStatus.REJECTED, 'Acknowledgement status REJECTED');
  }

  // 4. Execution Engine Full Lifecycle & Events Tests
  {
    const paperEngine = new PaperTradingEngine({ initialBalance: 100000 });
    paperEngine.processMarketData({ symbol: 'BTCUSDT', price: 95000 });

    const paperTarget = new PaperTradingTarget(paperEngine, 'paper-target');
    const engine = new ExecutionEngine();
    engine.registerTarget(paperTarget);

    let requestedFired = false;
    let startedFired = false;
    let sentFired = false;
    let ackFired = false;
    let completedFired = false;

    engine.on('execution.requested', () => (requestedFired = true));
    engine.on('execution.started', () => (startedFired = true));
    engine.on('execution.sent', () => (sentFired = true));
    engine.on('execution.acknowledged', () => (ackFired = true));
    engine.on('execution.completed', () => (completedFired = true));

    const result = await engine.execute({
      symbol: 'BTCUSDT',
      side: OrderSide.BUY,
      type: OrderType.MARKET,
      quantity: 1,
      price: 95000,
      targetId: 'paper-target',
    });

    assert(result.status === ExecutionStatus.COMPLETED, 'Execution result status should be COMPLETED');
    assert(
      result.orderData?.status === OrderStatus.FILLED || result.orderData?.status === OrderStatus.CLOSED,
      'Underlying order status should be FILLED or CLOSED'
    );
    assert(requestedFired, 'execution.requested event fired');
    assert(startedFired, 'execution.started event fired');
    assert(sentFired, 'execution.sent event fired');
    assert(ackFired, 'execution.acknowledged event fired');
    assert(completedFired, 'execution.completed event fired');
  }

  // 5. Placeholder Targets Execution Tests
  {
    const engine = new ExecutionEngine();
    engine.registerTarget(new ReplayTarget('replay-target'));
    engine.registerTarget(new BacktestTarget('backtest-target'));
    engine.registerTarget(new BrokerTarget('broker-target'));

    const replayRes = await engine.execute({
      symbol: 'BTCUSDT',
      side: OrderSide.BUY,
      type: OrderType.MARKET,
      quantity: 1,
      targetType: 'replay',
    });
    assert(replayRes.status === ExecutionStatus.COMPLETED, 'Replay target execution succeeded');

    const backtestRes = await engine.execute({
      symbol: 'BTCUSDT',
      side: OrderSide.BUY,
      type: OrderType.MARKET,
      quantity: 1,
      targetType: 'backtest',
    });
    assert(backtestRes.status === ExecutionStatus.COMPLETED, 'Backtest target execution succeeded');

    const brokerRes = await engine.execute({
      symbol: 'BTCUSDT',
      side: OrderSide.BUY,
      type: OrderType.MARKET,
      quantity: 1,
      targetType: 'broker',
    });
    assert(brokerRes.status === ExecutionStatus.COMPLETED, 'Broker target execution succeeded');
  }

  console.log('All Execution Engine unit tests passed successfully!');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
