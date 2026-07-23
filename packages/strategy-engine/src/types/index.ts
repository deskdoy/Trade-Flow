import { ValidationError, ValidationResult } from '@tradeflow/trading-domain';
import { StrategyContext } from '../context/StrategyContext.ts';
import { TradingIntent, TradingIntentAction } from '../intent/TradingIntent.ts';

export interface StrategyMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  supportedSymbols?: string[];
  supportedTimeframes?: string[];
  parameters?: Record<string, unknown>;
}

export interface Strategy {
  readonly metadata: StrategyMetadata;
  isEnabled: boolean;

  initialize?(params?: Record<string, unknown>): void;
  evaluate(context: StrategyContext): TradingIntent[];
  onEnable?(): void;
  onDisable?(): void;
}

export interface StrategyEngineSnapshotData {
  strategies: Array<{
    id: string;
    isEnabled: boolean;
    parameters?: Record<string, unknown>;
  }>;
  intentsBuffer: TradingIntent[];
  timestamp: string;
}

export type { ValidationError, ValidationResult };
export type { TradingIntent, TradingIntentAction };
export type { StrategyContext };

