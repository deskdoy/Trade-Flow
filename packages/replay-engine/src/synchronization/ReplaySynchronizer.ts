import { Candle } from '@tradeflow/shared';
import { MarketDataEngine } from '@tradeflow/market-data';
import { ChartEngine } from '@tradeflow/chart-engine';
import { IndicatorEngine } from '@tradeflow/indicators';
import { StrategyEngine } from '@tradeflow/strategy-engine';
import { PaperTradingEngine } from '@tradeflow/paper-trading';
import { PortfolioEngine } from '@tradeflow/portfolio-engine';
import { ReplayDataset } from '../dataset/ReplayDataset.ts';
import { ReplaySynchronizationTarget } from '../types/index.ts';

export type SynchronizerStepCallback = (
  candle: Candle,
  index: number,
  history: Candle[]
) => void;

export class ReplaySynchronizer {
  private targets: Map<string, ReplaySynchronizationTarget> = new Map();
  private stepCallbacks: Set<SynchronizerStepCallback> = new Set();

  public registerTarget(target: ReplaySynchronizationTarget): void {
    if (!target || typeof target.name !== 'string') {
      throw new Error('Invalid ReplaySynchronizationTarget');
    }
    this.targets.set(target.name, target);
  }

  public unregisterTarget(name: string): void {
    this.targets.delete(name);
  }

  public listTargets(): string[] {
    return Array.from(this.targets.keys());
  }

  public synchronize(
    candle: Candle,
    index: number,
    history: Candle[],
    datasetHash: string
  ): void {
    for (const target of this.targets.values()) {
      try {
        target.synchronize(candle, index, history, datasetHash);
      } catch (err) {
        console.error(`[ReplaySynchronizer] Error syncing target ${target.name}:`, err);
      }
    }
  }

  // Backward-compatibility wrappers creating Target plugins
  public registerMarketDataEngine(engine: MarketDataEngine | null): void {
    if (!engine) {
      this.unregisterTarget('MarketData');
      return;
    }
    this.registerTarget({
      name: 'MarketData',
      synchronize: (candle) => {
        const symbol = (candle as any).symbol || 'BTC/USD';
        const timeframe = (candle as any).timeframe || '1h';
        const mdAny = engine as any;
        if (typeof mdAny.emit === 'function') {
          mdAny.emit('newCandle', { symbol, timeframe, candle });
        }
      },
    });
  }

  public registerChartEngine(engine: ChartEngine | null): void {
    if (!engine) {
      this.unregisterTarget('Chart');
      return;
    }
    this.registerTarget({
      name: 'Chart',
      synchronize: (_candle, _index, history) => {
        engine.setCandles(history);
      },
    });
  }

  public registerIndicatorEngine(engine: IndicatorEngine | null): void {
    if (!engine) {
      this.unregisterTarget('Indicator');
      return;
    }
    this.registerTarget({
      name: 'Indicator',
      synchronize: (candle, _index, history) => {
        const symbol = (candle as any).symbol || 'BTC/USD';
        const timeframe = (candle as any).timeframe || '1h';
        engine.calculateAll(history, symbol, timeframe);
      },
    });
  }

  public registerStrategyEngine(engine: StrategyEngine | null): void {
    if (!engine) {
      this.unregisterTarget('Strategy');
      return;
    }
    this.registerTarget({
      name: 'Strategy',
      synchronize: (candle, _index, history) => {
        const symbol = (candle as any).symbol || 'BTC/USD';
        const timeframe = (candle as any).timeframe || '1h';
        engine.evaluate({
          currentCandle: candle,
          history,
          symbol,
          timeframe,
          currentTime: candle.time ?? (candle as any).timestamp,
        } as any);
      },
    });
  }

  public registerPaperTradingEngine(engine: PaperTradingEngine | null): void {
    if (!engine) {
      this.unregisterTarget('PaperTrading');
      return;
    }
    this.registerTarget({
      name: 'PaperTrading',
      synchronize: (candle) => {
        const symbol = (candle as any).symbol || 'BTC/USD';
        engine.processMarketData({
          symbol,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          time: candle.time,
        } as any);
      },
    });
  }

  public registerPortfolioEngine(engine: PortfolioEngine | null): void {
    if (!engine) {
      this.unregisterTarget('Portfolio');
      return;
    }
    this.registerTarget({
      name: 'Portfolio',
      synchronize: (candle) => {
        const symbol = (candle as any).symbol || 'BTC/USD';
        const peAny = engine as any;
        if (typeof peAny.updateMarketPrices === 'function') {
          peAny.updateMarketPrices([
            { symbol, price: candle.close, timestamp: candle.time },
          ]);
        }
      },
    });
  }

  public onStep(callback: SynchronizerStepCallback): () => void {
    this.stepCallbacks.add(callback);
    return () => this.stepCallbacks.delete(callback);
  }

  public sync(candle: Candle, index: number, dataset: ReplayDataset): void {
    if (!candle) return;
    const history = dataset.range(0, index + 1);
    const hash = dataset.datasetHash;

    this.synchronize(candle, index, history, hash);

    for (const callback of this.stepCallbacks) {
      try {
        callback(candle, index, history);
      } catch (err) {
        console.error('[ReplaySynchronizer] Error in step callback:', err);
      }
    }
  }

  public reset(): void {
    for (const target of this.targets.values()) {
      if (typeof target.reset === 'function') {
        try {
          target.reset();
        } catch (err) {
          console.error(`[ReplaySynchronizer] Error resetting target ${target.name}:`, err);
        }
      }
    }
    this.targets.clear();
    this.stepCallbacks.clear();
  }
}
