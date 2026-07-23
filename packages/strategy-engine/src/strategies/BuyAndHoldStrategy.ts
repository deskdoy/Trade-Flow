import { StrategyContext } from '../context/StrategyContext.ts';
import { TradingIntent } from '../intent/TradingIntent.ts';
import { BaseStrategy } from './BaseStrategy.ts';

export interface BuyAndHoldParams {
  quantity?: number;
}

export class BuyAndHoldStrategy extends BaseStrategy {
  private hasBought: boolean = false;

  constructor(params: BuyAndHoldParams = {}) {
    const quantity = params.quantity ?? 1;

    super({
      id: 'buy-and-hold',
      name: 'Buy and Hold Strategy',
      description: 'Executes a BUY signal on the first available candle and holds indefinitely.',
      version: '1.0.0',
      parameters: {
        quantity,
      },
    });
  }

  public evaluate(context: StrategyContext): TradingIntent[] {
    if (!this.isEnabled) {
      return [];
    }

    const quantity = (this.metadata.parameters?.quantity as number) || 1;

    // Check if position already exists in context
    const hasExistingPosition = context.positions?.some(
      (p) => p.symbol === context.symbol && p.isOpen
    );

    if (this.hasBought || hasExistingPosition) {
      return [];
    }

    if (context.candles && context.candles.length > 0) {
      this.hasBought = true;
      return [
        this.createIntent(context, 'BUY', {
          quantity,
          reason: 'Buy and Hold initial position entry',
        }),
      ];
    }

    return [];
  }

  public override onEnable(): void {
    // Keep tracking state intact or reset if explicitly required
  }
}
