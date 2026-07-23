import { MarginMode, PositionData, PositionSide } from '@tradeflow/trading-domain';
import { ClosedPositionRecord } from '../types/index.ts';

export class PositionBook {
  private openPositions: Map<string, PositionData> = new Map();
  private closedPositions: ClosedPositionRecord[] = [];

  /**
   * Adds or sets an open position
   */
  public addOrUpdatePosition(position: PositionData): PositionData {
    const updated = {
      ...position,
      updatedAt: position.updatedAt || new Date().toISOString(),
    };
    this.openPositions.set(updated.id, updated);
    return updated;
  }

  /**
   * Returns an open position by ID
   */
  public getPositionById(id: string): PositionData | undefined {
    return this.openPositions.get(id);
  }

  /**
   * Returns open positions matching a symbol
   */
  public getPositionsBySymbol(symbol: string): PositionData[] {
    return Array.from(this.openPositions.values()).filter((p) => p.symbol === symbol && p.isOpen);
  }

  /**
   * Returns all active open positions
   */
  public getOpenPositions(): PositionData[] {
    return Array.from(this.openPositions.values()).filter((p) => p.isOpen);
  }

  /**
   * Returns all closed positions history
   */
  public getClosedPositions(): ClosedPositionRecord[] {
    return [...this.closedPositions];
  }

  /**
   * Updates mark price for symbol across all open positions and recalculates unrealized PnL
   */
  public updateMarkPrice(symbol: string, markPrice: number): PositionData[] {
    const updatedPositions: PositionData[] = [];

    for (const [id, pos] of this.openPositions.entries()) {
      if (pos.symbol === symbol && pos.isOpen) {
        let unrealizedPnl = 0;
        if (pos.side === PositionSide.LONG) {
          unrealizedPnl = (markPrice - pos.entryPrice) * pos.quantity;
        } else if (pos.side === PositionSide.SHORT) {
          unrealizedPnl = (pos.entryPrice - markPrice) * pos.quantity;
        }

        const updated: PositionData = {
          ...pos,
          markPrice,
          unrealizedPnl,
          updatedAt: new Date().toISOString(),
        };

        this.openPositions.set(id, updated);
        updatedPositions.push(updated);
      }
    }

    return updatedPositions;
  }

  /**
   * Closes an open position by ID or symbol
   */
  public closePosition(
    positionIdOrSymbol: string,
    exitPrice: number,
    closedAt?: string
  ): ClosedPositionRecord | undefined {
    let position = this.openPositions.get(positionIdOrSymbol);

    if (!position) {
      position = Array.from(this.openPositions.values()).find(
        (p) => p.symbol === positionIdOrSymbol && p.isOpen
      );
    }

    if (!position || !position.isOpen) {
      return undefined;
    }

    const closeTime = closedAt || new Date().toISOString();
    const openedTimeMs = new Date(position.openedAt).getTime();
    const closedTimeMs = new Date(closeTime).getTime();
    const holdingTimeMs = Math.max(0, closedTimeMs - openedTimeMs);

    let realizedPnl = 0;
    if (position.side === PositionSide.LONG) {
      realizedPnl = (exitPrice - position.entryPrice) * position.quantity;
    } else {
      realizedPnl = (position.entryPrice - exitPrice) * position.quantity;
    }

    const totalCost = position.entryPrice * position.quantity;
    const pnlPercentage = totalCost > 0 ? (realizedPnl / totalCost) * 100 : 0;

    const closedRecord: ClosedPositionRecord = {
      id: position.id,
      symbol: position.symbol,
      side: position.side,
      quantity: position.quantity,
      entryPrice: position.entryPrice,
      exitPrice,
      realizedPnl,
      pnlPercentage,
      marginMode: position.marginMode || MarginMode.ISOLATED,
      leverage: position.leverage || 1,
      openedAt: position.openedAt,
      closedAt: closeTime,
      holdingTimeMs,
    };

    // Update position in book as closed
    const updatedPosition: PositionData = {
      ...position,
      isOpen: false,
      unrealizedPnl: 0,
      realizedPnl: (position.realizedPnl || 0) + realizedPnl,
      closedAt: closeTime,
      updatedAt: closeTime,
    };

    this.openPositions.delete(position.id);
    this.closedPositions.push(closedRecord);

    return closedRecord;
  }

  /**
   * Calculates current aggregate unrealized PnL across all open positions
   */
  public getAggregateUnrealizedPnl(): number {
    let total = 0;
    for (const pos of this.openPositions.values()) {
      if (pos.isOpen) {
        total += pos.unrealizedPnl || 0;
      }
    }
    return total;
  }

  /**
   * Calculates total realized PnL across all closed positions
   */
  public getAggregateRealizedPnl(): number {
    return this.closedPositions.reduce((sum, p) => sum + p.realizedPnl, 0);
  }

  /**
   * Calculates total position value across open positions
   */
  public getTotalPositionValue(): number {
    let total = 0;
    for (const pos of this.openPositions.values()) {
      if (pos.isOpen) {
        const price = pos.markPrice || pos.entryPrice;
        total += price * pos.quantity;
      }
    }
    return total;
  }

  /**
   * Calculates total used margin across open positions
   */
  public getTotalUsedMargin(): number {
    let total = 0;
    for (const pos of this.openPositions.values()) {
      if (pos.isOpen) {
        const price = pos.markPrice || pos.entryPrice;
        const leverage = Math.max(1, pos.leverage || 1);
        total += (price * pos.quantity) / leverage;
      }
    }
    return total;
  }

  /**
   * Restores state from snapshot
   */
  public restore(positions: PositionData[], closedPositions: ClosedPositionRecord[]): void {
    this.openPositions.clear();
    for (const pos of positions) {
      if (pos.isOpen) {
        this.openPositions.set(pos.id, { ...pos });
      }
    }
    this.closedPositions = closedPositions.map((cp) => ({ ...cp }));
  }

  /**
   * Resets position book
   */
  public clear(): void {
    this.openPositions.clear();
    this.closedPositions = [];
  }
}
