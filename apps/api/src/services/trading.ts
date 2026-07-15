import { MarketData, Order, OrderSide, OrderStatus, OrderType, Position, AccountInfo } from "@/packages/shared/src/types/index";
import { generateId } from "@/packages/shared/src/utils/index";

// Initial set of tickers
let tickers: Record<string, MarketData> = {
  "BTC/USD": {
    symbol: "BTC/USD",
    bid: 58240.5,
    ask: 58242.0,
    last: 58241.25,
    high: 59100.0,
    low: 57500.0,
    volume: 12450.5,
    timestamp: new Date().toISOString(),
  },
  "ETH/USD": {
    symbol: "ETH/USD",
    bid: 2542.1,
    ask: 2542.6,
    last: 2542.35,
    high: 2610.0,
    low: 2490.0,
    volume: 85240.2,
    timestamp: new Date().toISOString(),
  },
  "SOL/USD": {
    symbol: "SOL/USD",
    bid: 145.2,
    ask: 145.3,
    last: 145.25,
    high: 152.0,
    low: 139.5,
    volume: 341200.0,
    timestamp: new Date().toISOString(),
  },
  "AAPL": {
    symbol: "AAPL",
    bid: 189.45,
    ask: 189.5,
    last: 189.48,
    high: 191.2,
    low: 188.1,
    volume: 4500000,
    timestamp: new Date().toISOString(),
  },
  "TSLA": {
    symbol: "TSLA",
    bid: 220.15,
    ask: 220.25,
    last: 220.2,
    high: 228.5,
    low: 216.4,
    volume: 8200000,
    timestamp: new Date().toISOString(),
  },
};

// In-memory states
let account: AccountInfo = {
  id: "acc_tf_premium_01",
  balance: 100000.0,
  equity: 100000.0,
  marginUsed: 0.0,
  freeMargin: 100000.0,
  currency: "USD",
};

let positions: Position[] = [
  {
    symbol: "BTC/USD",
    averageEntryPrice: 57420.0,
    quantity: 0.5,
    marketValue: 29120.63,
    unrealizedPnl: 410.63,
    realizedPnl: 150.0,
  },
  {
    symbol: "AAPL",
    averageEntryPrice: 185.2,
    quantity: 100,
    marketValue: 18948.0,
    unrealizedPnl: 428.0,
    realizedPnl: 0.0,
  },
];

let orders: Order[] = [
  {
    id: "ord_01",
    symbol: "ETH/USD",
    price: 2500.0,
    quantity: 2.0,
    type: OrderType.LIMIT,
    side: OrderSide.BUY,
    status: OrderStatus.PENDING,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "ord_02",
    symbol: "TSLA",
    price: 220.2,
    quantity: 50,
    type: OrderType.MARKET,
    side: OrderSide.BUY,
    status: OrderStatus.FILLED,
    timestamp: new Date(Date.now() - 1800000).toISOString(),
  },
];

export class TradingService {
  // Update mock tickers using a simple random walk to make UI feel alive
  public static getTickers(): Record<string, MarketData> {
    const symbols = Object.keys(tickers);
    symbols.forEach((symbol) => {
      const ticker = tickers[symbol];
      const changePercent = (Math.random() - 0.5) * 0.002; // max 0.1% change
      const priceChange = ticker.last * changePercent;

      const last = ticker.last + priceChange;
      const spread = ticker.last * 0.0002; // tight 0.02% spread
      const bid = last - spread / 2;
      const ask = last + spread / 2;

      ticker.last = Number(last.toFixed(2));
      ticker.bid = Number(bid.toFixed(2));
      ticker.ask = Number(ask.toFixed(2));
      if (last > ticker.high) ticker.high = Number(last.toFixed(2));
      if (last < ticker.low) ticker.low = Number(last.toFixed(2));
      ticker.timestamp = new Date().toISOString();
    });

    this.updateEquityAndPnl();
    return tickers;
  }

  private static updateEquityAndPnl() {
    let totalUnrealizedPnl = 0;
    positions.forEach((pos) => {
      const ticker = tickers[pos.symbol];
      if (ticker) {
        pos.marketValue = Number((pos.quantity * ticker.last).toFixed(2));
        pos.unrealizedPnl = Number(((ticker.last - pos.averageEntryPrice) * pos.quantity).toFixed(2));
        totalUnrealizedPnl += pos.unrealizedPnl;
      }
    });

    account.equity = Number((account.balance + totalUnrealizedPnl).toFixed(2));
    account.freeMargin = Number((account.equity - account.marginUsed).toFixed(2));
  }

  public static getAccount(): AccountInfo {
    this.updateEquityAndPnl();
    return account;
  }

  public static getPositions(): Position[] {
    this.updateEquityAndPnl();
    return positions;
  }

  public static getOrders(): Order[] {
    return orders;
  }

  public static createOrder(symbol: string, type: OrderType, side: OrderSide, price: number, quantity: number): Order {
    const ticker = tickers[symbol];
    const executionPrice = type === OrderType.MARKET && ticker ? ticker.last : price;

    const newOrder: Order = {
      id: generateId("ord"),
      symbol,
      price: executionPrice,
      quantity,
      type,
      side,
      status: type === OrderType.MARKET ? OrderStatus.FILLED : OrderStatus.PENDING,
      timestamp: new Date().toISOString(),
    };

    orders.unshift(newOrder);

    // If order was market / filled immediately, let's update positions!
    if (newOrder.status === OrderStatus.FILLED) {
      const existingPosIndex = positions.findIndex((p) => p.symbol === symbol);
      const direction = side === OrderSide.BUY ? 1 : -1;

      if (existingPosIndex > -1) {
        const pos = positions[existingPosIndex];
        const newQty = pos.quantity + quantity * direction;

        if (newQty === 0) {
          // Close position
          account.balance += pos.realizedPnl + pos.unrealizedPnl; // basic pnl settle
          positions.splice(existingPosIndex, 1);
        } else {
          // Average entry adjustment (only for buys if net long)
          if (side === OrderSide.BUY) {
            pos.averageEntryPrice = Number(
              ((pos.averageEntryPrice * pos.quantity + executionPrice * quantity) / (pos.quantity + quantity)).toFixed(2)
            );
          }
          pos.quantity = Number(newQty.toFixed(4));
        }
      } else {
        // Create new position
        positions.push({
          symbol,
          averageEntryPrice: executionPrice,
          quantity: quantity * direction,
          marketValue: Number((quantity * executionPrice).toFixed(2)),
          unrealizedPnl: 0,
          realizedPnl: 0,
        });
      }
    }

    this.updateEquityAndPnl();
    return newOrder;
  }

  public static cancelOrder(id: string): boolean {
    const orderIndex = orders.findIndex((o) => o.id === id);
    if (orderIndex > -1 && orders[orderIndex].status === OrderStatus.PENDING) {
      orders[orderIndex].status = OrderStatus.CANCELLED;
      return true;
    }
    return false;
  }
}
