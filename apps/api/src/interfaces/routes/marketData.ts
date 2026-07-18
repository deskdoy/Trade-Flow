import { Router } from "express";

const router = Router();

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
    data: getMockMarketData()
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

export default router;
