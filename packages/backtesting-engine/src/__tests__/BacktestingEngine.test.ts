import { Candle } from '@tradeflow/shared';
import { Strategy, StrategyEngine, TradingIntent } from '@tradeflow/strategy-engine';
import { HistoricalDataset } from '../dataset/HistoricalDataset.ts';
import { SimulationClock } from '../timeline/SimulationClock.ts';
import { PlaybackController } from '../playback/PlaybackController.ts';
import { BacktestValidator } from '../validation/BacktestValidator.ts';
import { BacktestingEngine } from '../core/BacktestingEngine.ts';

function generateSampleCandles(count: number, basePrice: number = 100): Candle[] {
  const candles: Candle[] = [];
  let currentPrice = basePrice;
  const startTime = new Date('2025-01-01T00:00:00Z').getTime();

  for (let i = 0; i < count; i++) {
    const time = new Date(startTime + i * 3600 * 1000).toISOString();
    const change = (i % 2 === 0 ? 1 : -1) * (1 + (i % 5));
    const open = currentPrice;
    const close = Math.max(1, currentPrice + change);
    const high = Math.max(open, close) + 0.5;
    const low = Math.max(0.1, Math.min(open, close) - 0.5);
    const volume = 1000 + i;

    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
  }

  return candles;
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log('Running Backtesting Engine Unit Tests...\n');

  // Test 1: HistoricalDataset
  {
    console.log('Test 1: HistoricalDataset loading & slicing');
    const dataset = new HistoricalDataset();
    const candles = generateSampleCandles(10);
    dataset.load(candles);

    assert(dataset.length() === 10, 'Dataset length should be 10');
    assert(dataset.get(0)?.close === candles[0].close, 'Get candle 0 matches');
    assert(dataset.range(2, 5).length === 3, 'Range slice [2, 5) has length 3');

    const validation = dataset.validate();
    assert(validation.valid === true, 'Dataset validation should pass');
    console.log('✓ HistoricalDataset tests passed');
  }

  // Test 2: SimulationClock
  {
    console.log('Test 2: SimulationClock operations');
    const dataset = new HistoricalDataset();
    dataset.load(generateSampleCandles(5));
    const clock = new SimulationClock(dataset);

    clock.start(0);
    assert(clock.currentIndex() === 0, 'Clock index starts at 0');
    assert(clock.currentTime() === dataset.get(0)!.time, 'Clock currentTime matches candle 0');

    assert(clock.next() === true, 'Clock advances to 1');
    assert(clock.currentIndex() === 1, 'Current index is 1');

    clock.seek(3);
    assert(clock.currentIndex() === 3, 'Clock seeks to index 3');

    clock.pause();
    assert(clock.isPaused() === true, 'Clock paused');
    clock.resume();
    assert(clock.isPaused() === false, 'Clock resumed');
    clock.stop();
    assert(clock.currentIndex() === -1, 'Clock stopped and reset');

    console.log('✓ SimulationClock tests passed');
  }

  // Test 3: PlaybackController & Validator
  {
    console.log('Test 3: PlaybackController & BacktestValidator');
    const dataset = new HistoricalDataset();
    dataset.load(generateSampleCandles(5));
    const clock = new SimulationClock(dataset);
    const playback = new PlaybackController(clock);
    const validator = new BacktestValidator();

    playback.setSpeed('4x');
    assert(playback.getSpeed() === '4x', 'Playback speed should be 4x');

    const validConfig = validator.validateConfig({
      symbol: 'BTC/USD',
      timeframe: '1h',
      initialBalance: 10000,
    });
    assert(validConfig.valid === true, 'Config validation should pass');

    console.log('✓ PlaybackController & Validator tests passed');
  }

  // Test 4: End-to-End Backtest Run with Strategy & Portfolio
  {
    console.log('Test 4: End-to-End Backtest Simulation');
    const strategyEngine = new StrategyEngine();

    // Define simple strategy: Buy on odd candles, Sell on even candles
    const sampleStrategy: Strategy = {
      metadata: {
        id: 'test-strategy',
        name: 'Test Strategy',
        version: '1.0.0',
        author: 'TradeFlow',
        description: 'Simple test strategy',
        parameters: [],
      },
      isEnabled: true,
      evaluate: (ctx) => {
        const intents: TradingIntent[] = [];
        if (ctx.candles.length === 3) {
          intents.push({
            id: 'intent-buy-1',
            strategyId: 'test-strategy',
            symbol: ctx.symbol,
            action: 'BUY',
            quantity: 1,
            timestamp: ctx.currentTime,
          });
        } else if (ctx.candles.length === 6) {
          intents.push({
            id: 'intent-sell-1',
            strategyId: 'test-strategy',
            symbol: ctx.symbol,
            action: 'SELL',
            quantity: 1,
            timestamp: ctx.currentTime,
          });
        }
        return intents;
      },
    };

    strategyEngine.registerStrategy(sampleStrategy);

    const backtestingEngine = new BacktestingEngine({
      config: {
        symbol: 'BTC/USD',
        timeframe: '1h',
        initialBalance: 50000,
      },
      strategyEngine,
    });

    let startedFired = false;
    let stepCount = 0;
    let completedFired = false;

    backtestingEngine.on('backtest.started', () => {
      startedFired = true;
    });

    backtestingEngine.on('backtest.step', () => {
      stepCount++;
    });

    backtestingEngine.on('backtest.completed', () => {
      completedFired = true;
    });

    const candles = generateSampleCandles(20, 100);
    backtestingEngine.loadDataset(candles);
    backtestingEngine.run();

    assert(startedFired === true, 'backtest.started event was emitted');
    assert(stepCount === 20, '20 candle steps executed');
    assert(completedFired === true, 'backtest.completed event was emitted');

    const report = backtestingEngine.generateReport();
    const metrics = report.getMetrics();

    assert(metrics.totalCandles === 20, 'Report totalCandles is 20');
    assert(typeof metrics.winRate === 'number', 'Win rate is a number');
    assert(typeof metrics.netProfit === 'number', 'Net profit is a number');
    assert(typeof metrics.maxDrawdown === 'number', 'Max drawdown is a number');

    console.log('✓ End-to-End Backtest Simulation passed');
  }

  // Test 5: High Volume Dataset Performance (100,000 Candles)
  {
    console.log('Test 5: High Volume Dataset Performance (100,000 candles)');
    const largeCandles = generateSampleCandles(100000, 200);

    const backtestingEngine = new BacktestingEngine({
      config: {
        symbol: 'ETH/USD',
        timeframe: '1m',
        initialBalance: 100000,
      },
    });

    const startTime = Date.now();
    backtestingEngine.loadDataset(largeCandles);
    backtestingEngine.run();
    const elapsedMs = Date.now() - startTime;

    const report = backtestingEngine.generateReport();
    assert(report.getMetrics().totalCandles === 100000, 'Report processed 100,000 candles');
    console.log(`✓ 100,000 candles processed successfully in ${elapsedMs}ms`);
  }

  console.log('\nAll Backtesting Engine tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
