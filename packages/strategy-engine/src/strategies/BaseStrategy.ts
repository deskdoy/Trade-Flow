import { StrategyContext } from '../context/StrategyContext.ts';
import { TradingIntent, TradingIntentAction } from '../intent/TradingIntent.ts';
import { Strategy, StrategyMetadata } from '../types/index.ts';

export abstract class BaseStrategy implements Strategy {
  public isEnabled: boolean = true;

  constructor(public readonly metadata: StrategyMetadata) {}

  public initialize(params?: Record<string, unknown>): void {
    if (params) {
      this.metadata.parameters = { ...this.metadata.parameters, ...params };
    }
  }

  public enable(): void {
    this.isEnabled = true;
    this.onEnable();
  }

  public disable(): void {
    this.isEnabled = false;
    this.onDisable();
  }

  public abstract evaluate(context: StrategyContext): TradingIntent[];

  public onEnable(): void {}
  public onDisable(): void {}

  protected createIntent(
    context: StrategyContext,
    action: TradingIntentAction,
    options: Partial<Omit<TradingIntent, 'id' | 'strategyId' | 'symbol' | 'action' | 'timestamp'>> = {}
  ): TradingIntent {
    return {
      id: `intent_${this.metadata.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      strategyId: this.metadata.id,
      symbol: context.symbol,
      action,
      timeframe: context.timeframe,
      timestamp: context.currentTime || new Date().toISOString(),
      ...options,
    };
  }
}
