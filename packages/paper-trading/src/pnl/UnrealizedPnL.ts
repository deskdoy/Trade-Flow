import { PositionData, PositionSide } from '@tradeflow/trading-domain';

export class UnrealizedPnL {
  /**
   * Calculates unrealized PnL for a single open position given current mark price
   */
  public static calculateSingle(position: PositionData, markPrice: number): number {
    if (!position.isOpen || position.quantity <= 0) {
      return 0;
    }

    if (position.side === PositionSide.LONG) {
      return (markPrice - position.entryPrice) * position.quantity;
    }

    if (position.side === PositionSide.SHORT) {
      return (position.entryPrice - markPrice) * position.quantity;
    }

    return 0;
  }

  /**
   * Calculates sum of floating unrealized PnL across an array of positions
   */
  public static calculateTotal(
    positions: PositionData[],
    markPrices: Map<string, number>
  ): number {
    let totalPnl = 0;

    for (const position of positions) {
      if (!position.isOpen) continue;
      const markPrice = markPrices.get(position.symbol) ?? position.markPrice ?? position.entryPrice;
      totalPnl += UnrealizedPnL.calculateSingle(position, markPrice);
    }

    return totalPnl;
  }
}
