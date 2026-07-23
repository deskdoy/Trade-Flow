import { Candle } from '@tradeflow/shared';
import { MarketDataEngine } from '@tradeflow/market-data';
import { ChartEngine } from '@tradeflow/chart-engine';
import { IndicatorEngine } from '@tradeflow/indicators';
import { StrategyEngine } from '@tradeflow/strategy-engine';
import { PaperTradingEngine } from '@tradeflow/paper-trading';
import { PortfolioEngine } from '@tradeflow/portfolio-engine';
import { ReplayDataset } from '../dataset/ReplayDataset.ts';

export type SynchronizerStepCallback = (
  candle: Candle,
  index: number,
  history: Candle[]
) => void;

export class ReplaySynchronizer {
  private marketDataEngine: MarketDataEngine | null = null;
  private chartEngine: ChartEngine | null = null;
  private indicatorEngine: IndicatorEngine | null = null;
  private strategyEngine: StrategyEngine | null = null;
  private paperTradingEngine: PaperTradingEngine | null = null;
  private portfolioEngine: PortfolioEngine | null = null;

  private stepCallbacks: Set<SynchronizerStepCallback> = new Set();

  public registerMarketDataEngine(engine: MarketDataEngine | null): void {
    this.marketDataEngine = engine;
  }

  public registerChartEngine(engine: ChartEngine | null): void {
    this.chartEngine = engine;
  }

  public registerIndicatorEngine(engine: IndicatorEngine | null): void {
    this.indicatorEngine = engine;
  }

  public registerStrategyEngine(engine: StrategyEngine | null): void {
    this.strategyEngine = engine;
  }

  public registerPaperTradingEngine(engine: PaperTradingEngine | null): void {
    this.paperTradingEngine = engine;
  }

  public registerPortfolioEngine(engine: PortfolioEngine | null): void {
    this.portfolioEngine = engine;
  }

  public onStep(callback: SynchronizerStepCallback): () => void {
    this.stepCallbacks.add(callback);
    return () => this.stepCallbacks.delete(callback);
  }

  public sync(candle: Candle, index: number, dataset: ReplayDataset): void {
    if (!candle) return;

    const symbol = (candle as any).symbol || 'BTC/USD';
    const timeframe = (candle as any).timeframe || '1h';
    const history = dataset.range(0, index + 1);

    // 1. Market Data Engine
    if (this.marketDataEngine) {
      try {
        const mdAny = this.marketDataEngine as any;
        if (typeof mdAny.emit === 'function') {
          mdAny.emit('newCandle', { symbol, timeframe, candle });
        }
      } catch (err) {
        console.error('[ReplaySynchronizer] Error syncing MarketDataEngine:', err);
      }
    }

    // 2. Chart Engine
    if (this.chartEngine) {
      try {
        this.chartEngine.setCandles(history);
      } catch (err) {
        console.error('[ReplaySynchronizer] Error syncing ChartEngine:', err);
      }
    }

    // 3. Indicator Engine
    if (this.indicatorEngine) {
      try {
        this.indicatorEngine.calculateAll(history, symbol, timeframe);
      } catch (err) {
        console.error('[ReplaySynchronizer] Error syncing IndicatorEngine:', err);
      }
    }

    // 4. Paper Trading Engine
    if (this.paperTradingEngine) {
      try {
        this.paperTradingEngine.processMarketData({
          symbol,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          time: candle.time,
        } as any);
      } catch (err) {
        console.error('[ReplaySynchronizer] Error syncing PaperTradingEngine:', err);
      }
    }

    // 5. Strategy Engine
    if (this.strategyEngine) {
      try {
        this.strategyEngine.evaluate({
          currentCandle: candle,
          history,
          symbol,
          timeframe,
          currentTime: candle.time ?? (candle as any).timestamp,
        } as any);
      } catch (err) {
        console.error('[ReplaySynchronizer] Error syncing StrategyEngine:', err);
      }
    }

    // 6. Portfolio Engine
    if (this.portfolioEngine) {
      try {
        const peAny = this.portfolioEngine as any;
        if (typeof peAny.updateMarketPrices === 'function') {
          peAny.updateMarketPrices([{ symbol, price: candle.close, timestamp: candle.time }]);
        }
      } catch (err) {
        console.error('[ReplaySynchronizer] Error syncing PortfolioEngine:', err);
      }
    }

    // 7. Custom callbacks
    for (const callback of this.stepCallbacks) {
      try {
        callback(candle, index, history);
      } catch (err) {
        console.error('[ReplaySynchronizer] Error in step callback:', err);
      }
    }
  }

  public reset(): void {
    this.marketDataEngine = null;
    this.chartEngine = null;
    this.indicatorEngine = null;
    this.strategyEngine = null;
    this.paperTradingEngine = null;
    this.portfolioEngine = null;
    this.stepCallbacks.clear();
  }
}
