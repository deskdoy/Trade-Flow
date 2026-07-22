import {
  MarginMode,
  OrderSide,
  OrderType,
  PositionData,
  PositionSide,
} from '@tradeflow/trading-domain';
import { PaperAccountState, PaperTradingEngine } from '@tradeflow/paper-trading';
import { RiskEngine } from '../core/RiskEngine.ts';
import { ExposureCalculator } from '../exposure/ExposureCalculator.ts';
import { LeverageCalculator } from '../leverage/LeverageCalculator.ts';
import { LiquidationCalculator } from '../liquidation/LiquidationCalculator.ts';
import { MarginCalculator } from '../margin/MarginCalculator.ts';
import { PositionSizer } from '../sizing/PositionSizer.ts';
import { RiskPerTrade } from '../sizing/RiskPerTrade.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log('Running Risk & Margin Engine Unit Tests...');

  // 1. Margin Calculator Tests
  {
    const calculator = new MarginCalculator();
    const initialMargin = calculator.calculateInitialMargin(90000, 2, 10);
    assert(initialMargin === 18000, `Initial margin should be 18000, got ${initialMargin}`);

    const pos: PositionData = {
      id: 'pos_1',
      symbol: 'BTCUSDT',
      side: PositionSide.LONG,
      quantity: 1,
      entryPrice: 90000,
      markPrice: 92000,
      isOpen: true,
      marginMode: MarginMode.CROSS,
      unrealizedPnl: 2000,
      realizedPnl: 0,
      leverage: 10,
      openedAt: '',
      updatedAt: '',
    };

    const maintMargin = calculator.calculateMaintenanceMargin(pos, 0.005);
    assert(maintMargin === 460, `Maintenance margin should be 460, got ${maintMargin}`);

    const accountState: PaperAccountState = {
      balance: 50000,
      equity: 52000,
      usedMargin: 9000,
      freeMargin: 43000,
      floatingPnL: 2000,
      currency: 'USDT',
    };

    const marginCalc = calculator.calculateAccountMargin(accountState, [pos], 0.005);
    assert(marginCalc.initialMargin === 9000, `Account initial margin should be 9000, got ${marginCalc.initialMargin}`);
    assert(marginCalc.freeMargin === 43000, `Account free margin should be 43000, got ${marginCalc.freeMargin}`);
  }

  // 2. Leverage Calculator Tests
  {
    const calculator = new LeverageCalculator();
    const pos: PositionData = {
      id: 'pos_1',
      symbol: 'BTCUSDT',
      side: PositionSide.LONG,
      quantity: 2,
      entryPrice: 90000,
      markPrice: 90000,
      isOpen: true,
      marginMode: MarginMode.CROSS,
      unrealizedPnl: 0,
      realizedPnl: 0,
      leverage: 10,
      openedAt: '',
      updatedAt: '',
    };

    const accountState: PaperAccountState = {
      balance: 20000,
      equity: 20000,
      usedMargin: 18000,
      freeMargin: 2000,
      floatingPnL: 0,
      currency: 'USDT',
    };

    // Exposure = 2 * 90000 = 180000. Equity = 20000. Effective leverage = 9x.
    const leverage = calculator.calculateEffectiveLeverage(accountState, [pos]);
    assert(leverage === 9, `Effective leverage should be 9, got ${leverage}`);

    const levInfo = calculator.evaluateLeverage(accountState, [pos], 10);
    assert(levInfo.isLeverageAllowed === true, 'Leverage 9x should be allowed under 10x max');
  }

  // 3. Liquidation Calculator Tests
  {
    const calculator = new LiquidationCalculator();
    // Long position at 90000 entry, 10x leverage, 0.5% maint margin
    // Price_liq = 90000 * (1 - 0.1) / (1 - 0.005) = 81000 / 0.995 = 81407.035
    const longLiqPrice = calculator.calculateLiquidationPrice(PositionSide.LONG, 90000, 10, 0.005);
    assert(Math.abs(longLiqPrice - 81407.035) < 0.1, `Long liquidation price calculated incorrectly: ${longLiqPrice}`);

    // Short position at 90000 entry, 10x leverage, 0.5% maint margin
    // Price_liq = 90000 * (1 + 0.1) / (1 + 0.005) = 99000 / 1.005 = 98507.46
    const shortLiqPrice = calculator.calculateLiquidationPrice(PositionSide.SHORT, 90000, 10, 0.005);
    assert(Math.abs(shortLiqPrice - 98507.46) < 0.1, `Short liquidation price calculated incorrectly: ${shortLiqPrice}`);
  }

  // 4. Exposure Calculator Tests
  {
    const calculator = new ExposureCalculator();
    const pos1: PositionData = {
      id: 'pos_1',
      symbol: 'BTCUSDT',
      side: PositionSide.LONG,
      quantity: 1,
      entryPrice: 90000,
      markPrice: 90000,
      isOpen: true,
      marginMode: MarginMode.CROSS,
      unrealizedPnl: 0,
      realizedPnl: 0,
      leverage: 10,
      openedAt: '',
      updatedAt: '',
    };
    const pos2: PositionData = {
      id: 'pos_2',
      symbol: 'ETHUSDT',
      side: PositionSide.SHORT,
      quantity: 10,
      entryPrice: 3000,
      markPrice: 3000,
      isOpen: true,
      marginMode: MarginMode.CROSS,
      unrealizedPnl: 0,
      realizedPnl: 0,
      leverage: 5,
      openedAt: '',
      updatedAt: '',
    };

    const exp = calculator.calculateExposures([pos1, pos2]);
    assert(exp.totalGrossExposure === 120000, `Total gross exposure should be 120000, got ${exp.totalGrossExposure}`);
    assert(exp.totalNetExposure === 60000, `Total net exposure should be 60000, got ${exp.totalNetExposure}`);
  }

  // 5. Position Sizing Tests
  {
    const riskPerTrade = new RiskPerTrade();
    // Balance $100,000, Risk 1% = $1,000. Entry $90,000, Stop $85,000 (distance $5,000).
    // Quantity = 1000 / 5000 = 0.2 BTC.
    const qty = riskPerTrade.calculateQuantityByRisk(100000, 1, 90000, 85000);
    assert(qty === 0.2, `Calculated quantity should be 0.2, got ${qty}`);

    const sizer = new PositionSizer();
    const result = sizer.calculatePositionSize({
      accountBalance: 100000,
      riskPercentage: 1,
      entryPrice: 90000,
      stopLossPrice: 85000,
      leverage: 10,
    });

    assert(result.isFeasible === true, 'Sizing should be feasible');
    assert(result.recommendedQuantity === 0.2, 'Recommended quantity should be 0.2');
    assert(result.initialMarginRequired === 1800, `Initial margin should be 1800, got ${result.initialMarginRequired}`);
  }

  // 6. Risk Engine Integration & Validation Tests
  {
    const riskEngine = new RiskEngine({
      maxAccountExposure: 200000,
      maxSymbolExposure: 100000,
      maxLeverage: 20,
      maxRiskPerTradePct: 2,
    });

    const paperEngine = new PaperTradingEngine({
      initialBalance: 50000,
      currency: 'USDT',
      defaultLeverage: 10,
    });

    let approvedEvents = 0;
    let rejectedEvents = 0;

    riskEngine.on('risk.order.approved', () => {
      approvedEvents++;
    });
    riskEngine.on('risk.order.rejected', () => {
      rejectedEvents++;
    });

    // Valid order within limits
    const validRes = riskEngine.validatePaperOrder(paperEngine, {
      symbol: 'BTCUSDT',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      quantity: 0.5,
      price: 90000,
    }, 10);

    assert(validRes.approved === true, 'Valid order should be approved');
    assert(approvedEvents === 1, 'Approved event should fire');

    // Invalid order exceeding symbol exposure limit ($100,000 limit)
    // Quantity 2 * 90000 = $180,000 exposure -> Should reject
    const invalidRes = riskEngine.validatePaperOrder(paperEngine, {
      symbol: 'BTCUSDT',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      quantity: 2,
      price: 90000,
    }, 10);

    assert(invalidRes.approved === false, 'Order exceeding symbol exposure limit should be rejected');
    assert(rejectedEvents === 1, 'Rejected event should fire');
    assert(invalidRes.reasons.length > 0, 'Rejection should contain reasons');
  }

  console.log('All Risk & Margin Engine unit tests passed successfully!');
}

runTests();
