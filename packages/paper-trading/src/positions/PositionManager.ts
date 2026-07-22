import {
  MarginMode,
  OrderSide,
  PositionData,
  PositionLifecycle,
  PositionSide,
  TradeData,
} from '@tradeflow/trading-domain';
import { PositionUpdateResult } from '../types/index.ts';

export class PositionManager {
  private openPositions: Map<string, PositionData> = new Map();
  private closedPositions: PositionData[] = [];
  private lifecycle: PositionLifecycle = new PositionLifecycle();

  /**
   * Processes an executed trade and updates or opens a position
   */
  public processTrade(
    trade: TradeData,
    leverage: number = 1,
    marginMode: MarginMode = MarginMode.CROSS
  ): PositionUpdateResult {
    const existing = this.openPositions.get(trade.symbol);

    if (!existing) {
      const posSide = trade.side === OrderSide.BUY ? PositionSide.LONG : PositionSide.SHORT;
      const posId = `pos_${trade.symbol}_${Date.now()}`;

      const newPosition = this.lifecycle.openPosition({
        id: posId,
        symbol: trade.symbol,
        side: posSide,
        quantity: trade.quantity,
        entryPrice: trade.price,
        marginMode,
        leverage,
      });

      this.openPositions.set(trade.symbol, newPosition);

      return {
        position: newPosition,
        isNew: true,
        isClosed: false,
        realizedPnL: 0,
      };
    }

    const { updatedPosition, realizedPnl } = this.lifecycle.updatePosition(
      existing,
      trade.quantity,
      trade.price,
      trade.side
    );

    if (!updatedPosition.isOpen) {
      this.openPositions.delete(trade.symbol);
      this.closedPositions.push(updatedPosition);
      return {
        position: updatedPosition,
        isNew: false,
        isClosed: true,
        realizedPnL: realizedPnl,
      };
    }

    this.openPositions.set(trade.symbol, updatedPosition);
    return {
      position: updatedPosition,
      isNew: false,
      isClosed: false,
      realizedPnL: realizedPnl,
    };
  }

  /**
   * Updates mark price for symbol positions
   */
  public updateMarkPrice(symbol: string, markPrice: number): PositionData[] {
    const updatedList: PositionData[] = [];
    const position = this.openPositions.get(symbol);

    if (position) {
      const updated = this.lifecycle.updateMarkPrice(position, markPrice);
      this.openPositions.set(symbol, updated);
      updatedList.push(updated);
    }

    return updatedList;
  }

  public getPosition(symbol: string): PositionData | undefined {
    return this.openPositions.get(symbol);
  }

  public getOpenPositions(): PositionData[] {
    return Array.from(this.openPositions.values());
  }

  public getClosedPositions(): PositionData[] {
    return [...this.closedPositions];
  }
}
