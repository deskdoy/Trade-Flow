import { EventBus } from '@tradeflow/core';
import { OrderData } from '@tradeflow/trading-domain';
import { PaperOrderParams } from '@tradeflow/paper-trading';
import {
  LiquidationInfo,
  MarginCalculation,
  PositionSizingResult,
  RiskValidationResult,
} from '../types/index.ts';

export interface RiskEventPayloadMap {
  'risk.order.approved': { orderParams?: PaperOrderParams; order?: OrderData; result: RiskValidationResult };
  'risk.order.rejected': { orderParams?: PaperOrderParams; order?: OrderData; result: RiskValidationResult };
  'risk.margin.updated': { margin: MarginCalculation };
  'risk.leverage.changed': { symbol: string; leverage: number };
  'risk.liquidation.updated': { liquidationInfo: LiquidationInfo };
  'risk.position.sized': { sizingResult: PositionSizingResult };
}

export type RiskEventType = keyof RiskEventPayloadMap;

export type RiskEventListener<K extends RiskEventType> = (
  payload: RiskEventPayloadMap[K]
) => void;

export class RiskEventEmitter {
  private eventBus: EventBus = new EventBus();

  public on<K extends RiskEventType>(
    event: K,
    listener: RiskEventListener<K>
  ): () => void {
    return this.eventBus.on<RiskEventPayloadMap[K]>(event, listener);
  }

  public off<K extends RiskEventType>(
    event: K,
    listener: RiskEventListener<K>
  ): void {
    this.eventBus.off<RiskEventPayloadMap[K]>(event, listener);
  }

  public emit<K extends RiskEventType>(
    event: K,
    payload: RiskEventPayloadMap[K]
  ): void {
    this.eventBus.emit<RiskEventPayloadMap[K]>(event, payload);
  }

  public clear(): void {
    this.eventBus.clear();
  }
}
