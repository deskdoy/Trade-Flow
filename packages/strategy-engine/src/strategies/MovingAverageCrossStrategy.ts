import { SMAIndicator } from '@tradeflow/indicators';
import { StrategyContext } from '../context/StrategyContext.ts';
import { TradingIntent } from '../intent/TradingIntent.ts';
import { SignalGenerator } from '../signals/SignalGenerator.ts';
import { BaseStrategy } from './BaseStrategy.ts';

export interface MovingAverageCrossParams {
  fastPeriod?: number;
  slowPeriod?: number;
  quantity?: number;
}

export class MovingAverageCrossStrategy extends BaseStrategy {
  constructor(params: MovingAverageCrossParams = {}) {
    const fastPeriod = params.fastPeriod ?? 9;
    const slowPeriod = params.slowPeriod ?? 21;
    const quantity = params.quantity ?? 1;

    super({
      id: 'ma-cross',
      name: 'Moving Average Cross Strategy',
      description: 'Generates BUY signal when fast SMA crosses above slow SMA, and SELL when it crosses below.',
      version: '1.0.0',
      parameters: {
        fastPeriod,
        slowPeriod,
        quantity,
      },
    });
  }

  public evaluate(context: StrategyContext): TradingIntent[] {
    if (!this.isEnabled) {
      return [];
    }

    const fastPeriod = (this.metadata.parameters?.fastPeriod as number) || 9;
    const slowPeriod = (this.metadata.parameters?.slowPeriod as number) || 21;
    const quantity = (this.metadata.parameters?.quantity as number) || 1;

    const candles = context.candles || [];
    if (candles.length < slowPeriod + 1) {
      return [];
    }

    const fastSma = new SMAIndicator('fast', { period: fastPeriod });
    const slowSma = new SMAIndicator('slow', { period: slowPeriod });

    const fastPoints = fastSma.calculate([...candles]);
    const slowPoints = slowSma.calculate([...candles]);

    if (fastPoints.length < 2 || slowPoints.length < 2) {
      return [];
    }

    const fastSeries = fastPoints.map((p) => p.value);
    const slowSeries = slowPoints.map((p) => p.value);

    // Get aligned trailing series (last 2 elements)
    const fastRecent = fastSeries.slice(-2);
    const slowRecent = slowSeries.slice(-2);

    if (SignalGenerator.crossAbove(fastRecent, slowRecent)) {
      return [
        this.createIntent(context, 'BUY', {
          quantity,
          reason: `Fast SMA (${fastPeriod}) crossed above Slow SMA (${slowPeriod})`,
        }),
      ];
    }

    if (SignalGenerator.crossBelow(fastRecent, slowRecent)) {
      return [
        this.createIntent(context, 'SELL', {
          quantity,
          reason: `Fast SMA (${fastPeriod}) crossed below Slow SMA (${slowPeriod})`,
        }),
      ];
    }

    return [];
  }
}
