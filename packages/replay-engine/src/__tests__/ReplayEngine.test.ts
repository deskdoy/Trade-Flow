import { Candle } from '@tradeflow/shared';
import {
  ReplayEngine,
  ReplayDataset,
  ReplayClock,
  ReplayController,
  ReplayNavigator,
  ReplayBuffer,
  ReplaySynchronizer,
  ReplaySnapshot,
  parseReplaySpeed,
  formatReplaySpeed,
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
  dataset.load(candles, 'MOCK_SOURCE', '1.0.0');

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

  const meta = dataset.getMetadata();
  if (meta.datasetSource !== 'MOCK_SOURCE' || meta.candleCount !== 10) {
    throw new Error('Dataset metadata source or count mismatch');
  }
  console.log('✓ ReplayDataset & ReplayValidator tests passed');

  // Test 2: ReplayClock & ReplaySpeed
  console.log('\nTest 2: ReplayClock & ReplaySpeed');
  const clock = new ReplayClock(dataset, '2x');
  if (clock.getSpeed() !== '2x') {
    throw new Error('Speed should be 2x');
  }
  if (clock.getSpeedNumeric() !== 2) {
    throw new Error('Numeric speed should be 2');
  }

  if (parseReplaySpeed('4x') !== 4 || parseReplaySpeed('MAX') !== 1000) {
    throw new Error('parseReplaySpeed failed');
  }
  if (formatReplaySpeed(16) !== '16x') {
    throw new Error('formatReplaySpeed failed');
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
  console.log('✓ ReplayClock & ReplaySpeed tests passed');

  // Test 3: ReplayController State Machine & Illegal Transitions
  console.log('\nTest 3: ReplayController FSM & Illegal State Transitions');
  const fsmClock = new ReplayClock(dataset, '1x');
  const controller = new ReplayController(fsmClock);

  // Initial state IDLE
  if (controller.getCurrentState() !== 'IDLE') {
    throw new Error('Initial controller state should be IDLE');
  }

  // Legal transition: IDLE -> LOADED
  const res1 = controller.transitionTo('LOADED');
  if (!res1.valid || controller.getCurrentState() !== 'LOADED') {
    throw new Error('Failed legal transition IDLE -> LOADED');
  }

  // Illegal transition: LOADED -> COMPLETED
  const res2 = controller.transitionTo('COMPLETED');
  if (res2.valid || controller.getCurrentState() !== 'LOADED') {
    throw new Error('Allowed illegal transition LOADED -> COMPLETED');
  }
  if (!res2.error || !res2.error.includes('Illegal state transition')) {
    throw new Error('Expected structured error for illegal transition');
  }

  // Legal transition: LOADED -> PLAYING -> PAUSED -> PLAYING
  controller.play();
  if (controller.getCurrentState() !== 'PLAYING') {
    throw new Error('Expected PLAYING state after play()');
  }

  controller.pause();
  if (controller.getCurrentState() !== 'PAUSED') {
    throw new Error('Expected PAUSED state after pause()');
  }

  controller.resume();
  if (controller.getCurrentState() !== 'PLAYING') {
    throw new Error('Expected PLAYING state after resume()');
  }

  controller.stop();
  if (controller.getCurrentState() !== 'STOPPED') {
    throw new Error('Expected STOPPED state after stop()');
  }

  console.log('✓ ReplayController FSM & Illegal State Transitions passed');

  // Test 4: ReplayCursor, ReplaySession & ReplayStatistics
  console.log('\nTest 4: ReplayCursor, ReplaySession & ReplayStatistics');
  const engine = new ReplayEngine({ speed: '4x' });
  engine.initialize();
  engine.loadDataset(candles);

  const cursorInitial = engine.getCursor();
  if (cursorInitial.index !== -1 || cursorInitial.playbackState !== 'LOADED') {
    throw new Error('Initial cursor index or state mismatch');
  }

  engine.play();
  engine.step(); // idx 1
  engine.step(); // idx 2
  engine.seek(5); // idx 5

  const cursorActive = engine.getCursor();
  if (cursorActive.index !== 5 || cursorActive.progressPercentage !== 60) {
    throw new Error(`Expected cursor index 5 and 60% progress, got ${cursorActive.index}, ${cursorActive.progressPercentage}%`);
  }

  const session = engine.getSession();
  if (!session.sessionId || session.playCount < 1 || session.seekCount !== 1) {
    throw new Error('Session tracking counts failed');
  }

  const stats = engine.getStatistics();
  if (stats.numberOfSteps < 2 || stats.numberOfSeeks !== 1) {
    throw new Error('Statistics tracking failed');
  }

  console.log('✓ ReplayCursor, ReplaySession & ReplayStatistics tests passed');

  // Test 5: ReplaySynchronizer Plugin Architecture
  console.log('\nTest 5: ReplaySynchronizer Plugin Architecture');
  const synchronizer = new ReplaySynchronizer();
  let customPluginSynced = false;

  synchronizer.registerTarget({
    name: 'CustomStrategyPlugin',
    synchronize: (candle, index, history, hash) => {
      customPluginSynced = true;
      if (index !== 2 || history.length !== 3 || !hash) {
        throw new Error('Plugin synchronize arguments mismatch');
      }
    },
  });

  const targets = synchronizer.listTargets();
  if (!targets.includes('CustomStrategyPlugin')) {
    throw new Error('Registered plugin not listed in targets');
  }

  synchronizer.sync(candles[2], 2, dataset);
  if (!customPluginSynced) {
    throw new Error('Custom plugin synchronize method was not called');
  }

  synchronizer.unregisterTarget('CustomStrategyPlugin');
  if (synchronizer.listTargets().includes('CustomStrategyPlugin')) {
    throw new Error('Failed to unregister target plugin');
  }

  console.log('✓ ReplaySynchronizer Plugin Architecture tests passed');

  // Test 6: Snapshot Compatibility & EngineHealth Diagnostics
  console.log('\nTest 6: Snapshot Compatibility & EngineHealth Diagnostics');
  const testEngine = new ReplayEngine({ speed: '2x' });
  testEngine.initialize();
  testEngine.loadDataset(candles);
  testEngine.play();
  testEngine.step();

  const fullSnapshot = testEngine.getSnapshot();
  if (!fullSnapshot.cursor || !fullSnapshot.session || !fullSnapshot.statistics) {
    throw new Error('Full snapshot missing cursor, session or statistics');
  }

  // Backward compatibility test: Old snapshot format without cursor/session/statistics
  const oldLegacySnapshot = {
    version: '1.0.0',
    engineVersion: '0.1.0',
    schemaVersion: 1,
    datasetHash: testEngine.getDataset().datasetHash,
    currentIndex: 4,
    currentTime: candles[4].time,
    speed: 2,
    state: 'PAUSED' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    playbackMode: 'REALTIME' as const,
  };

  testEngine.restoreSnapshot(oldLegacySnapshot);
  if (testEngine.getClock().getCurrentIndex() !== 4) {
    throw new Error('Failed restoring legacy snapshot format');
  }

  const health = testEngine.getHealth();
  if (
    !health.healthy ||
    health.datasetLoaded !== true ||
    health.currentIndex !== 4 ||
    health.remainingCandles !== 5
  ) {
    throw new Error('EngineHealth diagnostic output failed');
  }

  testEngine.destroy();
  console.log('✓ Snapshot Compatibility & EngineHealth Diagnostics passed');

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
  console.log('Benchmark measured on development hardware using an already in-memory dataset.');
  console.log('✓ Large Dataset Performance tests passed');

  console.log('\nAll Replay Engine tests passed successfully!');
}

runTests();
