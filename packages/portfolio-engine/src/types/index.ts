import { PositionData, PositionSide, MarginMode } from '@tradeflow/trading-domain';

export interface ClosedPositionRecord {
  id: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  realizedPnl: number;
  pnlPercentage: number;
  marginMode: MarginMode;
  leverage: number;
  openedAt: string;
  closedAt: string;
  holdingTimeMs: number;
}

export interface HoldingsData {
  cashBalance: number;
  usedMargin: number;
  freeMargin: number;
  buyingPower: number;
  totalEquity: number;
  accountExposure: number;
  updatedAt: string;
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
  balance: number;
  drawdown: number;
  drawdownPercent: number;
}

export interface DailyEquityPoint {
  date: string;
  openEquity: number;
  highEquity: number;
  lowEquity: number;
  closeEquity: number;
}

export interface EquityData {
  currentEquity: number;
  balance: number;
  unrealizedPnl: number;
  realizedPnl: number;
  peakEquity: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  equityHistory: EquityPoint[];
  dailyEquity: DailyEquityPoint[];
  updatedAt: string;
}

export interface PerformanceMetrics {
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  expectancy: number;
  sharpeRatio: number;
  sortinoRatio: number;
}

export interface TradingStatistics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  largestWin: number;
  largestLoss: number;
  longestWinningStreak: number;
  longestLosingStreak: number;
  currentWinningStreak: number;
  currentLosingStreak: number;
}

export interface PortfolioSnapshotData {
  positions: PositionData[];
  closedPositions: ClosedPositionRecord[];
  holdings: HoldingsData;
  equity: EquityData;
  statistics: TradingStatistics;
  performance: PerformanceMetrics;
  timestamp: string;
}

export interface PortfolioEngineOptions {
  initialBalance?: number;
  defaultLeverage?: number;
  maxEquityHistoryPoints?: number;
}
