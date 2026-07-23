import { EngineHealth, EngineLifecycle, SnapshotProvider } from '@tradeflow/core';
import { PositionData } from '@tradeflow/trading-domain';
import { PaperAccountState, PaperOrderParams, PaperTradingEngine } from '@tradeflow/paper-trading';
import { ExposureCalculator } from '../exposure/ExposureCalculator.ts';
import { RiskEventEmitter, RiskEventListener, RiskEventType } from '../events/RiskEvents.ts';
import { LeverageCalculator } from '../leverage/LeverageCalculator.ts';
import { LiquidationCalculator } from '../liquidation/LiquidationCalculator.ts';
import { MarginCalculator } from '../margin/MarginCalculator.ts';
import { PositionSizer } from '../sizing/PositionSizer.ts';
import {
  LeverageInfo,
  LiquidationInfo,
  MarginCalculation,
  PositionSizingParams,
  PositionSizingResult,
  RiskLimits,
  RiskValidationResult,
  TotalExposure,
} from '../types/index.ts';
import { RiskValidator } from '../validation/RiskValidator.ts';

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxLeverage: 20,
  maxAccountExposure: 500000,
  maxSymbolExposure: 100000,
  maxRiskPerTradePct: 2,
  maxDrawdownPct: 20,
  minMaintenanceMarginPct: 0.005,
  maxOpenPositions: 10,
};

export class RiskEngine implements SnapshotProvider<RiskLimits>, EngineLifecycle {
  private limits: RiskLimits;
  private emitter: RiskEventEmitter = new RiskEventEmitter();
  private marginCalculator: MarginCalculator = new MarginCalculator();
  private leverageCalculator: LeverageCalculator = new LeverageCalculator();
  private liquidationCalculator: LiquidationCalculator = new LiquidationCalculator();
  private exposureCalculator: ExposureCalculator = new ExposureCalculator();
  private positionSizer: PositionSizer = new PositionSizer();
  private validator: RiskValidator = new RiskValidator();
  private startTime: number = Date.now();

  constructor(customLimits?: Partial<RiskLimits>) {
    this.limits = { ...DEFAULT_RISK_LIMITS, ...customLimits };
  }

  public initialize(): void {
    // Lifecycle initialization
  }

  public getVersion(): string {
    return '0.1.0';
  }

  public getHealth(): EngineHealth {
    return {
      healthy: true,
      version: this.getVersion(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      objectCount: Object.keys(this.limits).length,
    };
  }

  public reset(): void {
    this.limits = { ...DEFAULT_RISK_LIMITS };
  }

  public destroy(): void {
    this.reset();
    this.emitter.clear();
  }

  public getSnapshot(): RiskLimits {
    return this.getLimits();
  }

  public restoreSnapshot(snapshot: RiskLimits): void {
    this.limits = { ...snapshot };
  }


  public getLimits(): RiskLimits {
    return { ...this.limits };
  }

  public updateLimits(newLimits: Partial<RiskLimits>): RiskLimits {
    this.limits = { ...this.limits, ...newLimits };
    return this.getLimits();
  }

  /**
   * Validates a proposed order against current risk parameters
   */
  public validateOrder(
    orderParams: PaperOrderParams,
    accountState: PaperAccountState,
    openPositions: PositionData[],
    initialBalance: number = accountState.balance,
    leverage: number = 1
  ): RiskValidationResult {
    const result = this.validator.validate(
      orderParams,
      accountState,
      initialBalance,
      openPositions,
      this.limits,
      leverage
    );

    if (result.approved) {
      this.emitter.emit('risk.order.approved', { orderParams, result });
    } else {
      this.emitter.emit('risk.order.rejected', { orderParams, result });
    }

    return result;
  }

  /**
   * Integration point with PaperTradingEngine
   * Requests risk validation before executing order in PaperTradingEngine
   */
  public validatePaperOrder(
    paperEngine: PaperTradingEngine,
    orderParams: PaperOrderParams,
    leverage: number = 1
  ): RiskValidationResult {
    const accountState = paperEngine.getAccountState();
    const openPositions = paperEngine.getOpenPositions();

    return this.validateOrder(orderParams, accountState, openPositions, accountState.balance, leverage);
  }

  /**
   * Calculates account margin metrics and emits margin updated event
   */
  public calculateMargin(
    accountState: PaperAccountState,
    openPositions: PositionData[]
  ): MarginCalculation {
    const margin = this.marginCalculator.calculateAccountMargin(
      accountState,
      openPositions,
      this.limits.minMaintenanceMarginPct
    );

    this.emitter.emit('risk.margin.updated', { margin });
    return margin;
  }

  /**
   * Calculates effective leverage metrics
   */
  public calculateLeverage(
    accountState: PaperAccountState,
    openPositions: PositionData[]
  ): LeverageInfo {
    return this.leverageCalculator.evaluateLeverage(
      accountState,
      openPositions,
      this.limits.maxLeverage
    );
  }

  /**
   * Updates position leverage limit and emits leverage changed event
   */
  public updateSymbolLeverage(symbol: string, leverage: number): void {
    this.emitter.emit('risk.leverage.changed', { symbol, leverage });
  }

  /**
   * Calculates liquidation price for a position and emits liquidation updated event
   */
  public calculateLiquidation(position: PositionData): LiquidationInfo {
    const liquidationInfo = this.liquidationCalculator.evaluatePositionLiquidation(
      position,
      this.limits.minMaintenanceMarginPct
    );

    this.emitter.emit('risk.liquidation.updated', { liquidationInfo });
    return liquidationInfo;
  }

  /**
   * Calculates gross and net exposures across all open positions
   */
  public calculateExposure(openPositions: PositionData[]): TotalExposure {
    return this.exposureCalculator.calculateExposures(openPositions);
  }

  /**
   * Calculates position size recommendation and emits position sized event
   */
  public sizePosition(params: PositionSizingParams): PositionSizingResult {
    const sizingResult = this.positionSizer.calculatePositionSize(params);
    this.emitter.emit('risk.position.sized', { sizingResult });
    return sizingResult;
  }

  // Event Listeners
  public on<K extends RiskEventType>(
    event: K,
    listener: RiskEventListener<K>
  ): () => void {
    return this.emitter.on(event, listener);
  }

  public off<K extends RiskEventType>(
    event: K,
    listener: RiskEventListener<K>
  ): void {
    this.emitter.off(event, listener);
  }
}
