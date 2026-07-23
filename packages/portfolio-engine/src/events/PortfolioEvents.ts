import { EventBus } from '@tradeflow/core';
import { PositionData } from '@tradeflow/trading-domain';
import {
  ClosedPositionRecord,
  EquityData,
  HoldingsData,
  PerformanceMetrics,
  PortfolioSnapshotData,
  TradingStatistics,
} from '../types/index.ts';

export interface PortfolioEventPayloadMap {
  'portfolio.updated': { snapshot: PortfolioSnapshotData };
  'portfolio.position.opened': { position: PositionData };
  'portfolio.position.updated': { position: PositionData };
  'portfolio.position.closed': { closedPosition: ClosedPositionRecord };
  'portfolio.holdings.updated': { holdings: HoldingsData };
  'portfolio.equity.updated': { equity: EquityData };
  'portfolio.performance.updated': { performance: PerformanceMetrics };
  'portfolio.statistics.updated': { statistics: TradingStatistics };
}

export type PortfolioEventType = keyof PortfolioEventPayloadMap;

export type PortfolioEventListener<K extends PortfolioEventType> = (
  payload: PortfolioEventPayloadMap[K]
) => void;

export class PortfolioEventEmitter {
  private eventBus: EventBus = new EventBus();

  public on<K extends PortfolioEventType>(
    event: K,
    listener: PortfolioEventListener<K>
  ): () => void {
    return this.eventBus.on<PortfolioEventPayloadMap[K]>(event, listener);
  }

  public off<K extends PortfolioEventType>(
    event: K,
    listener: PortfolioEventListener<K>
  ): void {
    this.eventBus.off<PortfolioEventPayloadMap[K]>(event, listener);
  }

  public emit<K extends PortfolioEventType>(
    event: K,
    payload: PortfolioEventPayloadMap[K]
  ): void {
    this.eventBus.emit<PortfolioEventPayloadMap[K]>(event, payload);
  }

  public clear(): void {
    this.eventBus.clear();
  }
}
