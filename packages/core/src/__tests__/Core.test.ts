import assert from 'node:assert';
import { EventBus, PluginManager } from '../index.ts';

function runCoreTests() {
  console.log('Running Core Package Tests...');

  // EventBus Test
  {
    const bus = new EventBus();
    let received = false;
    const unsub = bus.on('test.event', (data: { val: number }) => {
      assert.strictEqual(data.val, 42);
      received = true;
    });

    bus.emit('test.event', { val: 42 });
    assert.ok(received);

    unsub();
    received = false;
    bus.emit('test.event', { val: 42 });
    assert.strictEqual(received, false);
  }

  // PluginManager Test
  {
    const pm = new PluginManager();
    let initCalled = false;
    pm.register({
      id: 'p1',
      name: 'Plugin 1',
      initialize: () => {
        initCalled = true;
      },
    });

    assert.ok(initCalled);
    assert.strictEqual(pm.list().length, 1);
    assert.ok(pm.get('p1'));

    pm.unregister('p1');
    assert.strictEqual(pm.list().length, 0);
  }

  console.log('All Core Package tests passed!');
}

runCoreTests();
