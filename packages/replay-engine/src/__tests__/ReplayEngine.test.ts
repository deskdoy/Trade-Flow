import { Candle } from '@tradeflow/shared';
import {
  ReplayEngine,
  ReplayDataset,
  ReplayClock,
  ReplayNavigator,
  ReplayBuffer,
  ReplaySynchronizer,
  ReplaySnapshot,
  ReplayValidator,
} from '../index.ts';

function createMockCandles(count: number): Candle[] {
  const candles: Candle[] = [];
  const baseTime = Date.parse('2026-01-01T00:00:00Z');

  for (let i = 0; i < count; i++) {
    const time = new Date(baseTime + i * 3600 * 1000).toISOString();
    candles.push({
      time,
      open: 100 + (i % 10),
      high: 105 + (i % 10),
      low: 95 + (i % 10),
      close: 102 + (i % 10),
      volume: 1000 + i,
      symbol: 'BTC/USD',
      timeframe: '1h',
    } as any);
  }

  return candles;
}

function runTests() {
  console.log('Running Replay Engine Unit Tests...\n');

  // Test 1: ReplayDataset & Validation
  console.log('Test 1: ReplayDataset & ReplayValidator');
  const candles = createMockCandles(10);
  const dataset = new ReplayDataset();
  dataset.load(candles);

  if (dataset.count() !== 10) {
    throw new Error(`Expected count 10, got ${dataset.count()}`);
  }

  const valResult = dataset.validate();
  if (!valResult.valid) {
    throw new Error(`Expected dataset to be valid, got errors: ${valResult.errors.join(', ')}`);
  }

  if (!dataset.datasetHash || dataset.datasetHash === 'empty-dataset') {
    throw new Error('Expected deterministic datasetHash');
  }
  console.log('✓ ReplayDataset & ReplayValidator tests passed');

  // Test 2: ReplayClock
  console.log('\nTest 2: ReplayClock');
  const clock = new ReplayClock(dataset, 2);
  if (clock.getSpeed() !== 2) {
    throw new Error('Speed should be 2');
  }

  clock.play();
  if (clock.getState() !== 'PLAYING') {
    throw new Error('State should be PLAYING');
  }
  if (clock.getCurrentIndex() !== 0) {
    throw new Error('Initial index on play should be 0');
  }

  clock.step();
  if (clock.getCurrentIndex() !== 1) {
    throw new Error('Index after step should be 1');
  }

  clock.pause();
  if (clock.getState() !== 'PAUSED') {
    throw new Error('State should be PAUSED');
  }
  console.log('✓ ReplayClock tests passed');

  // Test 3: ReplayNavigator & Seek Operations
  console.log('\nTest 3: ReplayNavigator & Seek Operations');
  const navClock = new ReplayClock(dataset, 1);
  const navigator = new ReplayNavigator(dataset, navClock);

  navigator.goToIndex(5);
  if (navClock.getCurrentIndex() !== 5) {
    throw new Error(`Expected index 5, got ${navClock.getCurrentIndex()}`);
  }

  navigator.goToBeginning();
  if (navClock.getCurrentIndex() !== 0) {
    throw new Error('Expected index 0 for beginning');
  }

  navigator.goToEnd();
  if (navClock.getCurrentIndex() !== 9) {
    throw new Error('Expected index 9 for end');
  }

  const targetDate = candles[3].time;
  navigator.goToDate(targetDate);
  if (navClock.getCurrentIndex() !== 3) {
    throw new Error(`Expected index 3 for date ${targetDate}, got ${navClock.getCurrentIndex()}`);
  }
  console.log('✓ ReplayNavigator tests passed');

  // Test 4: ReplayBuffer
  console.log('\nTest 4: ReplayBuffer');
  const buffer = new ReplayBuffer(3);
  buffer.push(candles[0]);
  buffer.push(candles[1]);
  buffer.push(candles[2]);
  if (buffer.size() !== 3) {
    throw new Error(`Expected buffer size 3, got ${buffer.size()}`);
  }

  buffer.push(candles[3]); // Should evict candles[0]
  if (buffer.size() !== 3) {
    throw new Error(`Expected bounded buffer size 3, got ${buffer.size()}`);
  }
  if (buffer.getHistory()[0].time !== candles[1].time) {
    throw new Error('Oldest candle should have been evicted');
  }
  console.log('✓ ReplayBuffer tests passed');

  // Test 5: ReplaySynchronizer
  console.log('\nTest 5: ReplaySynchronizer');
  const synchronizer = new ReplaySynchronizer();
  let stepReceived = false;

  synchronizer.onStep((candle, index, history) => {
    stepReceived = true;
    if (index !== 2) throw new Error('Incorrect step index in sync callback');
    if (history.length !== 3) throw new Error('Incorrect history length in sync callback');
  });

  synchronizer.sync(candles[2], 2, dataset);
  if (!stepReceived) {
    throw new Error('Expected synchronizer step callback to fire');
  }
  console.log('✓ ReplaySynchronizer tests passed');

  // Test 6: ReplayEngine Lifecycle, Events & Snapshots
  console.log('\nTest 6: ReplayEngine End-to-End, Events & Snapshots');
  const engine = new ReplayEngine({ speed: 10 });
  engine.initialize();

  if (engine.getVersion() !== '0.1.0') {
    throw new Error(`Unexpected version ${engine.getVersion()}`);
  }

  let startedEvent = false;
  let stepEventCount = 0;

  engine.on('replay.started', () => {
    startedEvent = true;
  });

  engine.on('replay.step', () => {
    stepEventCount++;
  });

  engine.loadDataset(candles);
  engine.play();

  if (!startedEvent) {
    throw new Error('replay.started event was not emitted');
  }

  // Perform steps
  engine.step(); // index 1
  engine.step(); // index 2
  engine.step(); // index 3

  if (stepEventCount !== 3) {
    throw new Error(`Expected 3 step events, got ${stepEventCount}`);
  }

  const snapshot = engine.getSnapshot();
  if (snapshot.currentIndex !== 3) {
    throw new Error(`Expected snapshot currentIndex 3, got ${snapshot.currentIndex}`);
  }

  engine.reset();
  if (engine.getClock().getCurrentIndex() !== -1) {
    throw new Error('Expected index -1 after reset');
  }

  engine.loadDataset(candles);
  engine.restoreSnapshot(snapshot);
  if (engine.getClock().getCurrentIndex() !== 3) {
    throw new Error(`Expected restored index 3, got ${engine.getClock().getCurrentIndex()}`);
  }

  const health = engine.getHealth();
  if (!health.healthy) {
    throw new Error('Expected engine health to be true');
  }

  engine.destroy();
  console.log('✓ ReplayEngine Lifecycle, Events & Snapshots tests passed');

  // Test 7: Large Dataset Performance (100,000 candles)
  console.log('\nTest 7: Large Dataset Performance (100,000 candles)');
  const largeCandles = createMockCandles(100000);
  const largeEngine = new ReplayEngine();
  const startTime = Date.now();
  largeEngine.loadDataset(largeCandles);
  const loadTimeMs = Date.now() - startTime;

  if (largeEngine.getDataset().count() !== 100000) {
    throw new Error('Failed to load 100,000 candles');
  }

  const seekStartTime = Date.now();
  largeEngine.seek(50000);
  const seekTimeMs = Date.now() - seekStartTime;

  if (largeEngine.getClock().getCurrentIndex() !== 50000) {
    throw new Error('Seek in large dataset failed');
  }

  console.log(`Loaded 100,000 candles in ${loadTimeMs}ms, seeked to 50,000 in ${seekTimeMs}ms`);
  console.log('✓ Large Dataset Performance tests passed');

  console.log('\nAll Replay Engine tests passed successfully!');
}

runTests();
