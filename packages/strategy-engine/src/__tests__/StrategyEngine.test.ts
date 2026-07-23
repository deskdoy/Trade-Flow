import { Candle } from '@tradeflow/shared';
import { StrategyEngine } from '../core/StrategyEngine.ts';
import { SignalGenerator } from '../signals/SignalGenerator.ts';
import { BuyAndHoldStrategy } from '../strategies/BuyAndHoldStrategy.ts';
import { MovingAverageCrossStrategy } from '../strategies/MovingAverageCrossStrategy.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function generateCandles(count: number, startPrice: number, trend: 'up' | 'down' | 'flat'): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;

  for (let i = 0; i < count; i++) {
    const time = new Date(Date.now() - (count - i) * 60000).toISOString();
    const open = price;
    if (trend === 'up') {
      price += 10;
    } else if (trend === 'down') {
      price -= 10;
    }
    const close = price;
    const high = Math.max(open, close) + 2;
    const low = Math.min(open, close) - 2;

    candles.push({ time, open, high, low, close, volume: 100 });
  }

  return candles;
}

async function runTests() {
  console.log('Running Strategy Engine Unit Tests...');

  // 1. SignalGenerator Helpers
  {
    assert(SignalGenerator.crossAbove([10, 20], [15, 18]), 'crossAbove should be true');
    assert(!SignalGenerator.crossAbove([20, 10], [15, 18]), 'crossAbove should be false');

    assert(SignalGenerator.crossBelow([20, 10], [15, 12]), 'crossBelow should be true');
    assert(!SignalGenerator.crossBelow([10, 20], [15, 12]), 'crossBelow should be false');
  }

  // 2. Strategy Registration & Lifecycle
  {
    const engine = new StrategyEngine();
    const strategy = new BuyAndHoldStrategy();

    let registeredFired = false;
    let enabledFired = false;
    let disabledFired = false;

    engine.on('strategy.registered', () => (registeredFired = true));
    engine.on('strategy.enabled', () => (enabledFired = true));
    engine.on('strategy.disabled', () => (disabledFired = true));

    engine.registerStrategy(strategy);
    assert(registeredFired, 'strategy.registered event fired');
    assert(engine.getAllStrategies().length === 1, '1 strategy should be registered');

    // Duplicate registration should throw
    let threw = false;
    try {
      engine.registerStrategy(strategy);
    } catch {
      threw = true;
    }
    assert(threw, 'Duplicate strategy registration threw error');

    engine.disable('buy-and-hold');
    assert(disabledFired, 'strategy.disabled event fired');
    assert(!strategy.isEnabled, 'Strategy is disabled');

    engine.enable('buy-and-hold');
    assert(enabledFired, 'strategy.enabled event fired');
    assert(strategy.isEnabled, 'Strategy is enabled');
  }

  // 3. BuyAndHoldStrategy Evaluation
  {
    const engine = new StrategyEngine();
    const strategy = new BuyAndHoldStrategy({ quantity: 2 });
    engine.registerStrategy(strategy);

    const candles = generateCandles(5, 100, 'up');

    // First evaluation -> produces BUY intent
    const intents1 = engine.evaluate({
      symbol: 'BTCUSDT',
      timeframe: '1h',
      candles,
      currentTime: new Date().toISOString(),
    });

    assert(intents1.length === 1, '1 BUY intent should be generated on first evaluation');
    assert(intents1[0].action === 'BUY', 'Intent action should be BUY');
    assert(intents1[0].quantity === 2, 'Quantity should be 2');

    // Second evaluation -> produces NO intent
    const intents2 = engine.evaluate({
      symbol: 'BTCUSDT',
      timeframe: '1h',
      candles,
      currentTime: new Date().toISOString(),
    });

    assert(intents2.length === 0, 'No intents should be generated on subsequent evaluation');
  }

  // 4. MovingAverageCrossStrategy Evaluation
  {
    const engine = new StrategyEngine();
    const strategy = new MovingAverageCrossStrategy({ fastPeriod: 2, slowPeriod: 4, quantity: 1 });
    engine.registerStrategy(strategy);

    // Sequence where fast SMA crosses above slow SMA on the last bar
    const now = Date.now();
    const prices = [100, 100, 100, 100, 90, 130];
    const crossoverCandles: Candle[] = prices.map((price, idx) => ({
      time: new Date(now - (prices.length - idx) * 60000).toISOString(),
      open: price,
      high: price + 1,
      low: price - 1,
      close: price,
      volume: 100,
    }));

    let intentGeneratedFired = false;
    engine.on('strategy.intent.generated', () => (intentGeneratedFired = true));

    const intents = engine.evaluate({
      symbol: 'ETHUSDT',
      timeframe: '15m',
      candles: crossoverCandles,
      currentTime: new Date().toISOString(),
    });

    assert(intents.length > 0, 'At least 1 intent should be generated on crossover');
    assert(intents[0].action === 'BUY', 'Crossover intent action should be BUY');
    assert(intentGeneratedFired, 'strategy.intent.generated event fired');
  }

  // 5. Strategy Validation & Supported Symbols
  {
    const engine = new StrategyEngine();
    const strategy = new BuyAndHoldStrategy();
    strategy.metadata.supportedSymbols = ['SOLUSDT'];

    engine.registerStrategy(strategy);

    let validationFailedFired = false;
    engine.on('strategy.validation.failed', () => (validationFailedFired = true));

    // Evaluate with unsupported symbol BTCUSDT
    const intents = engine.evaluate({
      symbol: 'BTCUSDT',
      timeframe: '1h',
      candles: generateCandles(2, 100, 'up'),
      currentTime: new Date().toISOString(),
    });

    assert(intents.length === 0, 'No intents generated for unsupported symbol');
    assert(validationFailedFired, 'strategy.validation.failed event fired for unsupported symbol');
  }

  console.log('All Strategy Engine unit tests passed successfully!');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
