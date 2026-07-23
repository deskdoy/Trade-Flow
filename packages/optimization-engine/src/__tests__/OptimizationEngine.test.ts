import { Candle } from '@tradeflow/shared';
import { BaseStrategy, StrategyContext, TradingIntent } from '@tradeflow/strategy-engine';
import {
  OptimizationEngine,
  ParameterGenerator,
  ParameterValidator,
  ResultRanking,
} from '../index.ts';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function generateSampleCandles(count: number = 20): Candle[] {
  const candles: Candle[] = [];
  const baseTime = new Date('2025-01-01T00:00:00Z').getTime();
  let close = 100;

  for (let i = 0; i < count; i++) {
    const open = close;
    close = open + (i % 2 === 0 ? 2 : -1);
    const iso = new Date(baseTime + i * 3600 * 1000).toISOString();
    candles.push({
      symbol: 'BTC/USD',
      timeframe: '1h',
      time: iso,
      timestamp: iso,
      open,
      high: Math.max(open, close) + 1,
      low: Math.min(open, close) - 1,
      close,
      volume: 1000 + i * 10,
    });
  }

  return candles;
}

class TestParamStrategy extends BaseStrategy {
  constructor(id: string, period: number, riskPct: number) {
    super({
      id: `${id}-${period}-${riskPct}`,
      name: `Test Strategy P=${period}`,
      version: '1.0.0',
      parameters: { period, riskPct },
    });
  }

  public override evaluate(context: StrategyContext): TradingIntent[] {
    const period = (this.metadata.parameters?.period as number) ?? 10;
    if (period < 15 && context.currentCandle && context.currentCandle.close > 100) {
      return [
        this.createIntent(context, 'BUY', {
          quantity: 1,
          reason: 'Test buy signal',
        }),
      ];
    }
    return [];
  }
}

async function runTests() {
  console.log('Running Optimization Engine Unit Tests...\n');

  // Test 1: Parameter Generator (Grid Search & Random Search)
  {
    console.log('Test 1: Parameter Generator (Grid Search & Random Search)');
    const ranges: any[] = [
      { name: 'fast', type: 'NUMBER', min: 5, max: 15, step: 5 },
      { name: 'slow', type: 'NUMBER', min: 20, max: 30, step: 10 },
      { name: 'type', type: 'CATEGORY', options: ['EMA', 'SMA'] },
    ];

    const grid = ParameterGenerator.generate(ranges, 'GRID_SEARCH');
    assert(grid.length === 12, `Grid count should be 12 (3*2*2), got ${grid.length}`);
    assert(grid[0].fast === 5 && grid[0].slow === 20 && grid[0].type === 'EMA', 'First combination matches');

    const random = ParameterGenerator.generate(ranges, 'RANDOM_SEARCH', 5, 123456);
    assert(random.length === 5, `Random search count should be 5, got ${random.length}`);
    console.log('✓ Parameter Generator tests passed');
  }

  // Test 2: Parameter Validator
  {
    console.log('Test 2: Parameter Validator');
    const invalidRange: any = { name: 'test', type: 'NUMBER', min: 20, max: 10, step: 1 };
    const valResult = ParameterValidator.validateRange(invalidRange);
    assert(valResult.valid === false, 'Validator rejects min > max');

    const validSpace: any[] = [
      { name: 'p1', type: 'NUMBER', min: 1, max: 10, step: 1 },
      { name: 'p2', type: 'CATEGORY', options: ['A', 'B'] },
    ];
    const spaceVal = ParameterValidator.validateSpace(validSpace);
    assert(spaceVal.valid === true, 'Validator accepts valid space');
    console.log('✓ Parameter Validator tests passed');
  }

  // Test 3: Result Ranking
  {
    console.log('Test 3: Result Ranking');
    const items: any[] = [
      { id: '1', metrics: { netProfit: 100, maxDrawdown: 10 } },
      { id: '2', metrics: { netProfit: 500, maxDrawdown: 25 } },
      { id: '3', metrics: { netProfit: 250, maxDrawdown: 5 } },
    ];

    const rankedNetProfit = ResultRanking.rank(items, 'netProfit');
    assert(rankedNetProfit[0].id === '2' && rankedNetProfit[0].rank === 1, 'Top rank by net profit is item 2');
    assert(rankedNetProfit[2].id === '1' && rankedNetProfit[2].rank === 3, 'Bottom rank by net profit is item 1');

    const rankedDd = ResultRanking.rank(items, 'maxDrawdown');
    assert(rankedDd[0].id === '3' && rankedDd[0].rank === 1, 'Top rank by max drawdown (lowest) is item 3');
    console.log('✓ Result Ranking tests passed');
  }

  // Test 4: End-to-End Grid Search Optimization
  {
    console.log('Test 4: End-to-End Grid Search Optimization');
    const candles = generateSampleCandles(20);
    const engine = new OptimizationEngine({
      config: {
        mode: 'GRID_SEARCH',
        symbol: 'BTC/USD',
        timeframe: '1h',
        rankingMetric: 'netProfit',
      },
      parameterRanges: [
        { name: 'period', type: 'NUMBER', min: 10, max: 20, step: 10 },
        { name: 'riskPct', type: 'NUMBER', min: 1, max: 2, step: 1 },
      ],
    });

    engine.loadDataset(candles);

    let startedEmitted = false;
    let completedEmitted = false;
    let runsCompleted = 0;

    engine.on('optimization.started', (data) => {
      startedEmitted = true;
      assert(data.totalRuns === 4, 'Total runs in started event is 4');
    });

    engine.on('optimization.run.completed', () => {
      runsCompleted++;
    });

    engine.on('optimization.completed', () => {
      completedEmitted = true;
    });

    const report = engine.run((params) => {
      return new TestParamStrategy('test-strat', params.period, params.riskPct);
    });

    assert(startedEmitted === true, 'Started event emitted');
    assert(completedEmitted === true, 'Completed event emitted');
    assert(runsCompleted === 4, '4 run completed events received');
    assert(report.getResults().length === 4, 'Report contains 4 results');
    assert(report.getBestResult() !== undefined, 'Report has best result');
    assert(engine.getState() === 'COMPLETED', 'Engine state is COMPLETED');
    console.log('✓ End-to-End Grid Search Optimization passed');
  }

  // Test 5: Cancellation Support
  {
    console.log('Test 5: Cancellation Support');
    const candles = generateSampleCandles(20);
    const engine = new OptimizationEngine({
      config: {
        mode: 'GRID_SEARCH',
        symbol: 'BTC/USD',
      },
      parameterRanges: [
        { name: 'period', type: 'NUMBER', min: 10, max: 50, step: 10 },
      ],
    });

    engine.loadDataset(candles);

    let cancelEmitted = false;
    engine.on('optimization.cancelled', () => {
      cancelEmitted = true;
    });

    engine.on('optimization.run.started', (data) => {
      if (data.runIndex === 2) {
        engine.cancel();
      }
    });

    const report = engine.run((params) => {
      return new TestParamStrategy('test-strat', params.period, 1);
    });

    assert(engine.getState() === 'CANCELLED', 'Engine state is CANCELLED');
    assert(cancelEmitted === true, 'Cancellation event emitted');
    assert(report.getResults().length < 5, 'Results contain partial runs');
    console.log('✓ Cancellation tests passed');
  }

  // Test 6: Snapshot Provider & Lifecycle Contract
  {
    console.log('Test 6: Snapshot Provider & Lifecycle Contract');
    const engine = new OptimizationEngine();
    engine.initialize();

    assert(engine.getState() === 'IDLE', 'State initialized to IDLE');
    assert(engine.getVersion() === '0.1.0', 'Version is 0.1.0');

    const health = engine.getHealth();
    assert(health.healthy === true, 'Health is healthy');

    const snapshot = engine.getSnapshot();
    assert(snapshot.version === 1, 'Snapshot version is 1');
    assert(snapshot.engineVersion === '0.1.0', 'Snapshot engineVersion is 0.1.0');

    engine.restoreSnapshot({ ...snapshot, state: 'COMPLETED' });
    assert(engine.getState() === 'COMPLETED', 'Restored state is COMPLETED');

    engine.reset();
    assert(engine.getState() === 'IDLE', 'State reset to IDLE');

    engine.destroy();
    console.log('✓ Snapshot & Lifecycle tests passed');
  }

  console.log('\nAll Optimization Engine tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
