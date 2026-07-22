import { MarginMode, OrderSide, PositionSide } from '../enums/index.ts';
import { PositionData } from '../types/index.ts';

export class PositionLifecycle {
  /**
   * Opens a new position
   */
  public openPosition(params: {
    id: string;
    symbol: string;
    side: PositionSide;
    quantity: number;
    entryPrice: number;
    marginMode?: MarginMode;
    leverage?: number;
  }): PositionData {
    const now = new Date().toISOString();
    return {
      id: params.id,
      symbol: params.symbol,
      side: params.side,
      quantity: params.quantity,
      entryPrice: params.entryPrice,
      unrealizedPnl: 0,
      realizedPnl: 0,
      marginMode: params.marginMode ?? MarginMode.CROSS,
      leverage: params.leverage ?? 1,
      openedAt: now,
      updatedAt: now,
      isOpen: true,
    };
  }

  /**
   * Recalculates unrealized PnL given an updated mark price
   */
  public updateMarkPrice(position: PositionData, markPrice: number): PositionData {
    if (!position.isOpen || position.quantity <= 0) {
      return {
        ...position,
        markPrice,
        unrealizedPnl: 0,
        updatedAt: new Date().toISOString(),
      };
    }

    let unrealizedPnl = 0;
    if (position.side === PositionSide.LONG) {
      unrealizedPnl = (markPrice - position.entryPrice) * position.quantity;
    } else if (position.side === PositionSide.SHORT) {
      unrealizedPnl = (position.entryPrice - markPrice) * position.quantity;
    }

    return {
      ...position,
      markPrice,
      unrealizedPnl,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Updates position by applying a executed trade (increasing or decreasing size)
   */
  public updatePosition(
    position: PositionData,
    tradeQuantity: number,
    tradePrice: number,
    tradeSide: OrderSide
  ): { updatedPosition: PositionData; realizedPnl: number } {
    if (!position.isOpen) {
      throw new Error(`Cannot update closed position ID "${position.id}".`);
    }

    const now = new Date().toISOString();
    const isIncreasing =
      (position.side === PositionSide.LONG && tradeSide === OrderSide.BUY) ||
      (position.side === PositionSide.SHORT && tradeSide === OrderSide.SELL);

    if (isIncreasing) {
      // Adding size to existing position
      const totalQuantity = position.quantity + tradeQuantity;
      const weightedEntryPrice =
        (position.entryPrice * position.quantity + tradePrice * tradeQuantity) / totalQuantity;

      const updatedPosition: PositionData = {
        ...position,
        quantity: totalQuantity,
        entryPrice: weightedEntryPrice,
        updatedAt: now,
      };

      return {
        updatedPosition: this.updateMarkPrice(updatedPosition, position.markPrice ?? weightedEntryPrice),
        realizedPnl: 0,
      };
    } else {
      // Reducing or closing position
      const quantityToClose = Math.min(position.quantity, tradeQuantity);
      let pnl = 0;

      if (position.side === PositionSide.LONG) {
        pnl = (tradePrice - position.entryPrice) * quantityToClose;
      } else {
        pnl = (position.entryPrice - tradePrice) * quantityToClose;
      }

      const remainingQuantity = Math.max(0, position.quantity - tradeQuantity);
      const isFullyClosed = remainingQuantity <= 0;

      const updatedPosition: PositionData = {
        ...position,
        quantity: remainingQuantity,
        realizedPnl: position.realizedPnl + pnl,
        isOpen: !isFullyClosed,
        updatedAt: now,
        closedAt: isFullyClosed ? now : position.closedAt,
        unrealizedPnl: isFullyClosed ? 0 : position.unrealizedPnl,
      };

      return {
        updatedPosition: isFullyClosed
          ? updatedPosition
          : this.updateMarkPrice(updatedPosition, position.markPrice ?? tradePrice),
        realizedPnl: pnl,
      };
    }
  }

  /**
   * Fully closes a position at specified exit price
   */
  public closePosition(
    position: PositionData,
    exitPrice: number
  ): { closedPosition: PositionData; realizedPnl: number } {
    const sideToClose =
      position.side === PositionSide.LONG ? OrderSide.SELL : OrderSide.BUY;

    const result = this.updatePosition(position, position.quantity, exitPrice, sideToClose);
    return {
      closedPosition: result.updatedPosition,
      realizedPnl: result.realizedPnl,
    };
  }
}
