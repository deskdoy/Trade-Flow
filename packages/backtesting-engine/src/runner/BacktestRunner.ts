import { Candle } from '@tradeflow/shared';
import { OrderSide, OrderType } from '@tradeflow/trading-domain';
import { OrderManagementEngine, OrderRequest } from '@tradeflow/order-management';
import { PaperTradingEngine } from '@tradeflow/paper-trading';
import { PortfolioEngine } from '@tradeflow/portfolio-engine';
import { StrategyContext, StrategyEngine, TradingIntent } from '@tradeflow/strategy-engine';
import { HistoricalDataset } from '../dataset/HistoricalDataset.ts';
import { BacktestEventEmitter } from '../events/BacktestEvents.ts';
import { SimulationClock } from '../timeline/SimulationClock.ts';
import { BacktestConfig } from '../types/index.ts';

export class BacktestRunner {
  private config: BacktestConfig;
  private dataset: HistoricalDataset;
  private clock: SimulationClock;
  private strategyEngine: StrategyEngine;
  private oms: OrderManagementEngine;
  private paperTrading: PaperTradingEngine;
  private portfolioEngine: PortfolioEngine;
  private emitter: BacktestEventEmitter;
  private targetId: string;

  constructor(
    config: BacktestConfig,
    dataset: HistoricalDataset,
    clock: SimulationClock,
    strategyEngine: StrategyEngine,
    oms: OrderManagementEngine,
    paperTrading: PaperTradingEngine,
    portfolioEngine: PortfolioEngine,
    emitter: BacktestEventEmitter,
    targetId: string = 'paper-target'
  ) {
    this.config = config;
    this.dataset = dataset;
    this.clock = clock;
    this.strategyEngine = strategyEngine;
    this.oms = oms;
    this.paperTrading = paperTrading;
    this.portfolioEngine = portfolioEngine;
    this.emitter = emitter;
    this.targetId = targetId;

    this.wirePortfolioSync();
  }

  /**
   * Listens to Paper Trading events and mirrors position updates into Portfolio Engine
   */
  private wirePortfolioSync(): void {
    this.paperTrading.on('paper.position.opened', ({ position }) => {
      this.portfolioEngine.openPosition(position);
    });

    this.paperTrading.on('paper.position.closed', ({ position, exitPrice }) => {
      this.portfolioEngine.closePosition(position.id, exitPrice);
    });

    this.paperTrading.on('paper.position.updated', ({ position }) => {
      this.portfolioEngine.openPosition(position);
    });
  }

  /**
   * Runs a single historical candle step
   */
  public step(): boolean {
    const currentIndex = this.clock.currentIndex();
    const candle = this.dataset.get(currentIndex);

    if (!candle) {
      return false;
    }

    // 1. Feed candle to Paper Trading Engine to evaluate pending orders & trigger fills
    this.paperTrading.processMarketData(candle);

    // 2. Update Portfolio Engine mark price with candle close price
    this.portfolioEngine.updateMarkPrice(this.config.symbol, candle.close);

    // 3. Prepare historical candles slice container while preserving shared candle object references
    const maxHistory = this.config.maxCandleHistory ?? 1000;
    const startIdx = Math.max(0, currentIndex - maxHistory + 1);
    const candlesHistory = this.dataset.range(startIdx, currentIndex + 1);

    // 4. Build StrategyContext
    const context: StrategyContext = {
      symbol: this.config.symbol,
      timeframe: this.config.timeframe,
      candles: candlesHistory,
      portfolio: this.portfolioEngine.getSnapshot(),
      positions: this.portfolioEngine.getPositions(),
      equity: this.portfolioEngine.getHoldings().totalEquity,
      currentTime: candle.time,
    };

    // 5. Evaluate StrategyEngine to generate TradingIntents
    const intents = this.strategyEngine.evaluate(context);

    // 6. Forward TradingIntents to OMS
    for (const intent of intents) {
      this.processIntent(intent, candle);
    }

    // 7. Emit step event
    this.emitter.emit('backtest.step', {
      index: currentIndex,
      candle,
      totalCandles: this.dataset.length(),
    });

    return true;
  }

  /**
   * Converts a TradingIntent into an OMS OrderRequest
   */
  private processIntent(intent: TradingIntent, candle: Candle): void {
    const action = intent.action.toUpperCase();

    let side: OrderSide;
    if (action.includes('BUY') || action.includes('LONG')) {
      side = OrderSide.BUY;
    } else if (action.includes('SELL') || action.includes('SHORT')) {
      side = OrderSide.SELL;
    } else {
      // HOLD / CLOSE / UNKNOWN
      if (action.includes('CLOSE')) {
        const openPositions = this.portfolioEngine.getPositions();
        for (const pos of openPositions) {
          if (pos.symbol === this.config.symbol) {
            const closeSide = pos.side === 'LONG' ? OrderSide.SELL : OrderSide.BUY;
            const req: OrderRequest = {
              clientOrderId: `backtest-close-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              symbol: this.config.symbol,
              side: closeSide,
              type: OrderType.MARKET,
              quantity: pos.quantity,
              targetId: this.targetId,
              timestamp: candle.time,
            };
            this.oms.placeOrder(req);
          }
        }
      }
      return;
    }

    const quantity = intent.quantity ?? 1;
    const price = intent.price ?? candle.close;
    const orderType = intent.price ? OrderType.LIMIT : OrderType.MARKET;

    const req: OrderRequest = {
      clientOrderId: `backtest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      symbol: this.config.symbol,
      side,
      type: orderType,
      quantity,
      price,
      targetId: this.targetId,
      timestamp: candle.time,
    };

    this.oms.placeOrder(req);
  }
}
