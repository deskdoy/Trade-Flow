import { MarginMode, OrderData, OrderType, PositionData } from '@tradeflow/trading-domain';
import { AccountManager } from '../account/AccountManager.ts';
import {
  PaperTradingEventEmitter,
  PaperTradingEventListener,
  PaperTradingEventType,
} from '../events/PaperTradingEvents.ts';
import { OrderManager } from '../orders/OrderManager.ts';
import { PositionManager } from '../positions/PositionManager.ts';
import {
  CandleData,
  PaperAccountConfig,
  PaperAccountState,
  PaperOrderParams,
  PriceTick,
} from '../types/index.ts';

export class PaperTradingEngine {
  private orderManager: OrderManager = new OrderManager();
  private positionManager: PositionManager = new PositionManager();
  private accountManager: AccountManager;
  private emitter: PaperTradingEventEmitter = new PaperTradingEventEmitter();
  private lastPrices: Map<string, number> = new Map();
  private defaultLeverage: number;
  private defaultMarginMode: MarginMode;

  constructor(config: PaperAccountConfig) {
    this.accountManager = new AccountManager(config);
    this.defaultLeverage = config.defaultLeverage ?? 1;
    this.defaultMarginMode = config.marginMode ?? MarginMode.CROSS;
  }

  /**
   * Places a paper order and attempts immediate execution for MARKET orders if market price exists
   */
  public placeOrder(params: PaperOrderParams): OrderData {
    const order = this.orderManager.placeOrder(params);
    this.emitter.emit('paper.order.placed', { order });

    // If MARKET order and last price available, execute immediately
    if (order.type === OrderType.MARKET) {
      const lastPrice = this.lastPrices.get(params.symbol);
      if (lastPrice !== undefined) {
        this.processMarketData({
          symbol: params.symbol,
          price: lastPrice,
        });
      }
    }

    return this.orderManager.getOrder(order.id) || order;
  }

  /**
   * Cancels a pending order
   */
  public cancelOrder(orderId: string, reason?: string): OrderData {
    const cancelledOrder = this.orderManager.cancelOrder(orderId);
    this.emitter.emit('paper.order.cancelled', { order: cancelledOrder, reason });
    return cancelledOrder;
  }

  /**
   * Main entry point for candle or tick updates
   */
  public processMarketData(data: CandleData | PriceTick): void {
    const markPrice = 'high' in data ? (data as CandleData).close : (data as PriceTick).price;
    this.lastPrices.set(data.symbol, markPrice);

    // 1. Evaluate pending orders against market data
    const executions = this.orderManager.processMarketData(data);

    // 2. Process executions into positions
    for (const { filledOrder, trade } of executions) {
      this.emitter.emit('paper.order.filled', { order: filledOrder, trade });

      const updateResult = this.positionManager.processTrade(
        trade,
        this.defaultLeverage,
        this.defaultMarginMode
      );

      if (updateResult.isNew) {
        this.emitter.emit('paper.position.opened', { position: updateResult.position });
      } else if (updateResult.isClosed) {
        this.emitter.emit('paper.position.closed', {
          position: updateResult.position,
          realizedPnL: updateResult.realizedPnL,
          exitPrice: trade.price,
        });

        // Apply realized PnL to account balance
        this.accountManager.applyRealizedPnL(updateResult.realizedPnL);
        const state = this.accountManager.getAccountState();
        this.emitter.emit('paper.balance.updated', {
          balance: state.balance,
          currency: state.currency,
        });
      } else {
        this.emitter.emit('paper.position.updated', {
          position: updateResult.position,
          realizedPnL: updateResult.realizedPnL,
        });
      }
    }

    // 3. Update mark prices for open positions
    this.positionManager.updateMarkPrice(data.symbol, markPrice);

    // 4. Recalculate equity and emit equity update
    const openPositions = this.positionManager.getOpenPositions();
    const accountState = this.accountManager.recalculateEquity(openPositions);
    this.emitter.emit('paper.equity.updated', { accountState });
  }

  /**
   * Helper shorthand for candle update
   */
  public onCandle(candle: CandleData): void {
    this.processMarketData(candle);
  }

  /**
   * Helper shorthand for price tick update
   */
  public onPriceTick(tick: PriceTick): void {
    this.processMarketData(tick);
  }

  // Account Operations
  public deposit(amount: number): number {
    const newBal = this.accountManager.deposit(amount);
    const state = this.accountManager.getAccountState();
    this.emitter.emit('paper.balance.updated', { balance: state.balance, currency: state.currency });
    this.emitter.emit('paper.equity.updated', { accountState: state });
    return newBal;
  }

  public withdraw(amount: number): number {
    const newBal = this.accountManager.withdraw(amount);
    const state = this.accountManager.getAccountState();
    this.emitter.emit('paper.balance.updated', { balance: state.balance, currency: state.currency });
    this.emitter.emit('paper.equity.updated', { accountState: state });
    return newBal;
  }

  // Getters
  public getAccountState(): PaperAccountState {
    return this.accountManager.getAccountState();
  }

  public getOrders(symbol?: string): OrderData[] {
    return this.orderManager.getAllOrders(symbol);
  }

  public getPendingOrders(symbol?: string): OrderData[] {
    return this.orderManager.getPendingOrders(symbol);
  }

  public getOrder(orderId: string): OrderData | undefined {
    return this.orderManager.getOrder(orderId);
  }

  public getPosition(symbol: string): PositionData | undefined {
    return this.positionManager.getPosition(symbol);
  }

  public getOpenPositions(): PositionData[] {
    return this.positionManager.getOpenPositions();
  }

  public getClosedPositions(): PositionData[] {
    return this.positionManager.getClosedPositions();
  }

  // Event Subscription
  public on<K extends PaperTradingEventType>(
    event: K,
    listener: PaperTradingEventListener<K>
  ): () => void {
    return this.emitter.on(event, listener);
  }

  public off<K extends PaperTradingEventType>(
    event: K,
    listener: PaperTradingEventListener<K>
  ): void {
    this.emitter.off(event, listener);
  }
}
