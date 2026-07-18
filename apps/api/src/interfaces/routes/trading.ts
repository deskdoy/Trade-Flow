import { Router } from "express";

const router = Router();

// Mock database state
const balance = 100000.00;

// Helper to generate fluctuating market data
function getMockMarketData() {
  const now = new Date().toISOString();
  const btcBase = 65000 + Math.sin(Date.now() / 10000) * 150;
  const ethBase = 3400 + Math.cos(Date.now() / 10000) * 15;
  
  return [
    {
      symbol: "BTC/USD",
      bid: parseFloat((btcBase - 2.50).toFixed(2)),
      ask: parseFloat((btcBase + 2.50).toFixed(2)),
      last: parseFloat(btcBase.toFixed(2)),
      high: 66200.00,
      low: 64100.00,
      volume: 1452.84,
      timestamp: now
    },
    {
      symbol: "ETH/USD",
      bid: parseFloat((ethBase - 0.25).toFixed(2)),
      ask: parseFloat((ethBase + 0.25).toFixed(2)),
      last: parseFloat(ethBase.toFixed(2)),
      high: 3480.00,
      low: 3350.00,
      volume: 8940.12,
      timestamp: now
    }
  ];
}

router.get("/", (req, res) => {
  res.json({
    success: true,
    data: {
      message: "TradeFlow Core Engine is active",
      endpoints: ["/feed", "/live", "/positions", "/orders", "/account"]
    }
  });
});

router.get("/feed", (req, res) => {
  res.json({
    success: true,
    data: getMockMarketData()
  });
});

router.get("/live", (req, res) => {
  res.json({
    success: true,
    data: getMockMarketData()
  });
});

router.get("/market-data", (req, res) => {
  res.json({
    success: true,
    data: getMockMarketData()
  });
});

router.get("/positions", (req, res) => {
  const marketData = getMockMarketData();
  const btcPrice = marketData[0].last;
  const ethPrice = marketData[1].last;
  
  const btcQty = 1.25;
  const btcEntry = 64500.00;
  const btcMarketValue = btcQty * btcPrice;
  const btcUnrealized = btcMarketValue - (btcQty * btcEntry);

  const ethQty = 4.5;
  const ethEntry = 3380.00;
  const ethMarketValue = ethQty * ethPrice;
  const ethUnrealized = ethMarketValue - (ethQty * ethEntry);

  const positions = [
    {
      symbol: "BTC/USD",
      averageEntryPrice: btcEntry,
      quantity: btcQty,
      marketValue: parseFloat(btcMarketValue.toFixed(2)),
      unrealizedPnl: parseFloat(btcUnrealized.toFixed(2)),
      realizedPnl: 120.50
    },
    {
      symbol: "ETH/USD",
      averageEntryPrice: ethEntry,
      quantity: ethQty,
      marketValue: parseFloat(ethMarketValue.toFixed(2)),
      unrealizedPnl: parseFloat(ethUnrealized.toFixed(2)),
      realizedPnl: -45.00
    }
  ];

  res.json({
    success: true,
    data: positions
  });
});

router.get("/orders", (req, res) => {
  const now = new Date().toISOString();
  const orders = [
    {
      id: "ord_tf_98721",
      symbol: "BTC/USD",
      price: 64800.00,
      quantity: 0.15,
      type: "LIMIT",
      side: "BUY",
      status: "FILLED",
      timestamp: now
    },
    {
      id: "ord_tf_98722",
      symbol: "ETH/USD",
      price: 3450.00,
      quantity: 1.5,
      type: "LIMIT",
      side: "SELL",
      status: "PENDING",
      timestamp: now
    }
  ];

  res.json({
    success: true,
    data: orders
  });
});

router.get("/account", (req, res) => {
  const marketData = getMockMarketData();
  const btcPrice = marketData[0].last;
  const ethPrice = marketData[1].last;
  
  const btcUnrealized = (1.25 * btcPrice) - (1.25 * 64500.00);
  const ethUnrealized = (4.5 * ethPrice) - (4.5 * 3380.00);
  const totalUnrealized = btcUnrealized + ethUnrealized;
  
  const currentEquity = balance + totalUnrealized;
  const marginUsed = 4500.00;
  const freeMargin = currentEquity - marginUsed;

  res.json({
    success: true,
    data: {
      id: "acc_tf_main",
      balance: parseFloat(balance.toFixed(2)),
      equity: parseFloat(currentEquity.toFixed(2)),
      marginUsed: marginUsed,
      freeMargin: parseFloat(freeMargin.toFixed(2)),
      currency: "USD"
    }
  });
});

export default router;
