import { EngineHealth, EngineLifecycle, SnapshotProvider } from '@tradeflow/core';
import { ValidationResult } from '@tradeflow/trading-domain';
import { StrategyContext } from '../context/StrategyContext.ts';
import { StrategyEventEmitter, StrategyEventListener, StrategyEventType } from '../events/StrategyEvents.ts';
import { TradingIntent } from '../intent/TradingIntent.ts';
import { StrategyRegistry } from '../registry/StrategyRegistry.ts';
import { Strategy, StrategyEngineSnapshotData, StrategyMetadata } from '../types/index.ts';
import { StrategyValidator } from '../validation/StrategyValidator.ts';

export class StrategyEngine implements SnapshotProvider<StrategyEngineSnapshotData>, EngineLifecycle {
  private registry: StrategyRegistry = new StrategyRegistry();
  private emitter: StrategyEventEmitter = new StrategyEventEmitter();
  private intentsBuffer: TradingIntent[] = [];
  private startTime: number = Date.now();

  public initialize(): void {
    // Lifecycle initialization
  }

  public getVersion(): string {
    return '0.1.0';
  }

  public getHealth(): EngineHealth {
    return {
      healthy: true,
      version: this.getVersion(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      objectCount: this.registry.getAll().length,
      eventsPublished: this.intentsBuffer.length,
    };
  }

  public reset(): void {
    this.registry.clear();
    this.intentsBuffer = [];
  }

  public destroy(): void {
    this.reset();
    this.emitter.clear();
  }

  public validate(strategy: Strategy): ValidationResult {
    const existingIds = new Set(this.registry.getAll().map((s) => s.metadata.id));
    return StrategyValidator.validateRegistration(strategy, existingIds);
  }

  public getSnapshot(): StrategyEngineSnapshotData {
    return {
      strategies: this.registry.getAll().map((s) => ({
        id: s.metadata.id,
        isEnabled: s.isEnabled,
        parameters: s.metadata.parameters,
      })),
      intentsBuffer: [...this.intentsBuffer],
      timestamp: new Date().toISOString(),
    };
  }

  public restoreSnapshot(snapshot: StrategyEngineSnapshotData): void {
    if (snapshot.intentsBuffer) {
      this.intentsBuffer = [...snapshot.intentsBuffer];
    }
    if (snapshot.strategies) {
      for (const item of snapshot.strategies) {
        const strategy = this.registry.get(item.id);
        if (strategy) {
          strategy.isEnabled = item.isEnabled;
          if (item.parameters && strategy.initialize) {
            strategy.initialize(item.parameters);
          }
        }
      }
    }
  }

  /**
   * Registers a strategy with validation
   */
  public registerStrategy(strategy: Strategy): void {

    const existingIds = new Set(this.registry.getAll().map((s) => s.metadata.id));
    const valResult = StrategyValidator.validateRegistration(strategy, existingIds);

    if (!valResult.valid) {
      throw new Error(
        `Strategy registration failed: ${valResult.errors.map((e) => e.message).join('; ')}`
      );
    }

    this.registry.register(strategy);
    this.emitter.emit('strategy.registered', {
      strategyId: strategy.metadata.id,
      metadata: strategy.metadata,
    });
  }

  /**
   * Unregisters a strategy
   */
  public unregisterStrategy(strategyId: string): boolean {
    return this.registry.unregister(strategyId);
  }

  /**
   * Enables a registered strategy
   */
  public enable(strategyId: string): void {
    const strategy = this.registry.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy "${strategyId}" not found`);
    }
    strategy.isEnabled = true;
    strategy.onEnable?.();
    this.emitter.emit('strategy.enabled', { strategyId });
  }

  /**
   * Disables a registered strategy
   */
  public disable(strategyId: string): void {
    const strategy = this.registry.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy "${strategyId}" not found`);
    }
    strategy.isEnabled = false;
    strategy.onDisable?.();
    this.emitter.emit('strategy.disabled', { strategyId });
  }

  /**
   * Returns a strategy by ID
   */
  public getStrategy(strategyId: string): Strategy | undefined {
    return this.registry.get(strategyId);
  }

  /**
   * Returns all registered strategies
   */
  public getAllStrategies(): Strategy[] {
    return this.registry.getAll();
  }

  /**
   * Evaluates all enabled strategies against market/portfolio context
   */
  public evaluate(context: StrategyContext): TradingIntent[] {
    const newIntents: TradingIntent[] = [];
    const strategies = this.registry.getAll();

    for (const strategy of strategies) {
      if (!strategy.isEnabled) {
        continue;
      }

      const valResult = StrategyValidator.validateEvaluationContext(strategy, context);

      if (!valResult.valid) {
        this.emitter.emit('strategy.validation.failed', {
          strategyId: strategy.metadata.id,
          errors: valResult.errors,
        });
        continue;
      }

      try {
        const intents = strategy.evaluate(context) || [];

        for (const intent of intents) {
          newIntents.push(intent);
          this.intentsBuffer.push(intent);
          this.emitter.emit('strategy.intent.generated', { intent });
        }

        this.emitter.emit('strategy.evaluated', {
          strategyId: strategy.metadata.id,
          intentsCount: intents.length,
          timestamp: context.currentTime || new Date().toISOString(),
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.emitter.emit('strategy.validation.failed', {
          strategyId: strategy.metadata.id,
          errors: [{ field: 'evaluation', message: msg }],
        });
      }
    }

    return newIntents;
  }

  /**
   * Returns historical buffer of generated trading intents
   */
  public getTradingIntents(): TradingIntent[] {
    return [...this.intentsBuffer];
  }

  /**
   * Clears accumulated trading intents buffer
   */
  public clearIntents(): void {
    this.intentsBuffer = [];
  }

  // --- Event Subscription ---

  public on<K extends StrategyEventType>(
    event: K,
    listener: StrategyEventListener<K>
  ): () => void {
    return this.emitter.on(event, listener);
  }

  public off<K extends StrategyEventType>(
    event: K,
    listener: StrategyEventListener<K>
  ): void {
    this.emitter.off(event, listener);
  }
}
