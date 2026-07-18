import { Candle } from "@tradeflow/shared";

// Helper to generate a realistic sequence of OHLC candlestick data
function generateSampleCandles(
  basePrice: number,
  count: number,
  volatility: number,
  trend: number
): Candle[] {
  const candles: Candle[] = [];
  const now = new Date();
  
  let currentPrice = basePrice;
  
  for (let i = count; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateString = date.toISOString().split("T")[0]; // YYYY-MM-DD
    
    // Add a random walk step
    const change = (Math.random() - 0.5 + trend) * volatility * currentPrice;
    const open = parseFloat(currentPrice.toFixed(2));
    const close = parseFloat((currentPrice + change).toFixed(2));
    
    // Generate high and low based on open/close range plus some wick volatility
    const maxOC = Math.max(open, close);
    const minOC = Math.min(open, close);
    const high = parseFloat((maxOC + Math.random() * volatility * 0.5 * currentPrice).toFixed(2));
    const low = parseFloat((minOC - Math.random() * volatility * 0.5 * currentPrice).toFixed(2));
    
    const volume = Math.floor(1000 + Math.random() * 5000);
    
    candles.push({
      time: dateString,
      open,
      high,
      low,
      close,
      volume,
    });
    
    currentPrice = close;
  }
  
  return candles;
}

export const staticBtcCandles: Candle[] = generateSampleCandles(62000, 100, 0.015, 0.03);
export const staticEthCandles: Candle[] = generateSampleCandles(3200, 100, 0.02, 0.02);
export const staticSolCandles: Candle[] = generateSampleCandles(140, 100, 0.025, 0.04);
