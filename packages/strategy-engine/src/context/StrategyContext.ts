import { Candle, MarketData } from '@tradeflow/shared';
import { PositionData } from '@tradeflow/trading-domain';
import { PortfolioSnapshotData } from '@tradeflow/portfolio-engine';

export interface StrategyContext {
  symbol: string;
  timeframe: string;
  candles: ReadonlyArray<Candle>;
  indicators?: Readonly<Record<string, number | null | undefined>>;
  portfolio?: Readonly<PortfolioSnapshotData>;
  positions?: ReadonlyArray<PositionData>;
  equity?: number;
  marketState?: Readonly<MarketData>;
  currentTime: string;
}
