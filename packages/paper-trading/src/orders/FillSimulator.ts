import { OrderData, OrderSide, OrderType } from '@tradeflow/trading-domain';
import { CandleData, FillResult, PriceTick } from '../types/index.ts';

export class FillSimulator {
  /**
   * Evaluates if an order can be filled given a market candle or price tick
   */
  public evaluate(order: OrderData, marketData: CandleData | PriceTick): FillResult {
    if ('high' in marketData && 'low' in marketData) {
      return this.evaluateCandle(order, marketData as CandleData);
    }
    return this.evaluateTick(order, marketData as PriceTick);
  }

  private evaluateCandle(order: OrderData, candle: CandleData): FillResult {
    switch (order.type) {
      case OrderType.MARKET:
        return { canFill: true, fillPrice: candle.close };

      case OrderType.LIMIT: {
        if (!order.price) return { canFill: false };
        if (order.side === OrderSide.BUY) {
          // Buy Limit fills when candle low <= limit price
          if (candle.low <= order.price) {
            return { canFill: true, fillPrice: order.price };
          }
        } else if (order.side === OrderSide.SELL) {
          // Sell Limit fills when candle high >= limit price
          if (candle.high >= order.price) {
            return { canFill: true, fillPrice: order.price };
          }
        }
        return { canFill: false };
      }

      case OrderType.STOP_LOSS:
      case OrderType.STOP_LIMIT:
      case OrderType.TAKE_PROFIT: {
        const triggerPrice = order.stopPrice ?? order.price;
        if (!triggerPrice) return { canFill: false };

        if (order.side === OrderSide.BUY) {
          // Buy Stop activates when candle high >= stop price
          if (candle.high >= triggerPrice) {
            return { canFill: true, fillPrice: order.price ?? triggerPrice };
          }
        } else if (order.side === OrderSide.SELL) {
          // Sell Stop activates when candle low <= stop price
          if (candle.low <= triggerPrice) {
            return { canFill: true, fillPrice: order.price ?? triggerPrice };
          }
        }
        return { canFill: false };
      }

      default:
        return { canFill: false };
    }
  }

  private evaluateTick(order: OrderData, tick: PriceTick): FillResult {
    switch (order.type) {
      case OrderType.MARKET:
        return { canFill: true, fillPrice: tick.price };

      case OrderType.LIMIT: {
        if (!order.price) return { canFill: false };
        if (order.side === OrderSide.BUY && tick.price <= order.price) {
          return { canFill: true, fillPrice: order.price };
        }
        if (order.side === OrderSide.SELL && tick.price >= order.price) {
          return { canFill: true, fillPrice: order.price };
        }
        return { canFill: false };
      }

      case OrderType.STOP_LOSS:
      case OrderType.STOP_LIMIT:
      case OrderType.TAKE_PROFIT: {
        const triggerPrice = order.stopPrice ?? order.price;
        if (!triggerPrice) return { canFill: false };

        if (order.side === OrderSide.BUY && tick.price >= triggerPrice) {
          return { canFill: true, fillPrice: order.price ?? triggerPrice };
        }
        if (order.side === OrderSide.SELL && tick.price <= triggerPrice) {
          return { canFill: true, fillPrice: order.price ?? triggerPrice };
        }
        return { canFill: false };
      }

      default:
        return { canFill: false };
    }
  }
}
