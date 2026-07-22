import { OrderData, OrderSide, PositionData, PositionSide } from '@tradeflow/trading-domain';
import { PaperAccountState, PaperOrderParams } from '@tradeflow/paper-trading';

export interface RiskLimits {
  maxLeverage: number;               // Maximum allowable leverage (e.g. 20)
  maxAccountExposure: number;        // Maximum total account gross exposure in quote asset
  maxSymbolExposure: number;         // Maximum gross exposure per symbol in quote asset
  maxRiskPerTradePct: number;        // Maximum risk percentage per trade (e.g. 2 for 2%)
  maxDrawdownPct: number;            // Maximum account drawdown percentage allowed (e.g. 20)
  minMaintenanceMarginPct: number;   // Maintenance margin fraction (e.g. 0.005 for 0.5%)
  maxOpenPositions?: number;         // Maximum allowed concurrent open positions
}

export interface MarginCalculation {
  initialMargin: number;
  maintenanceMargin: number;
  usedMargin: number;
  freeMargin: number;
  marginLevelPct: number;
}

export interface LeverageInfo {
  effectiveLeverage: number;
  maxAllowedLeverage: number;
  isLeverageAllowed: boolean;
}

export interface LiquidationInfo {
  symbol: string;
  side: PositionSide;
  entryPrice: number;
  liquidationPrice: number;
  distanceToLiquidation: number;
  distanceToLiquidationPct: number;
}

export interface SymbolExposure {
  symbol: string;
  longExposure: number;
  shortExposure: number;
  netExposure: number;
  grossExposure: number;
}

export interface TotalExposure {
  totalGrossExposure: number;
  totalNetExposure: number;
  symbolExposures: Map<string, SymbolExposure>;
}

export interface PositionSizingParams {
  accountBalance: number;
  riskPercentage: number;
  entryPrice: number;
  stopLossPrice: number;
  leverage?: number;
}

export interface PositionSizingResult {
  recommendedQuantity: number;
  riskAmount: number;
  positionValue: number;
  initialMarginRequired: number;
  isFeasible: boolean;
  reason?: string;
}

export interface RiskValidationResult {
  approved: boolean;
  reasons: string[];
  metrics?: {
    requiredMargin?: number;
    freeMargin?: number;
    newExposure?: number;
    maxExposure?: number;
    effectiveLeverage?: number;
    maxLeverage?: number;
  };
}
