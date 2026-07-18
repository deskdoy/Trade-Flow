import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, DeepPartial, ChartOptions } from "lightweight-charts";
import { Candle } from "@tradeflow/shared";

export class ChartEngine {
  private chart: IChartApi | null = null;
  private candlestickSeries: ISeriesApi<"Candlestick"> | null = null;
  private container: HTMLElement;

  constructor(container: HTMLElement, theme: "light" | "dark" = "dark") {
    this.container = container;
    this.initialize(theme);
  }

  /**
   * Initializes the lightweight chart inside the target container
   */
  private initialize(theme: "light" | "dark"): void {
    const isDark = theme === "dark";
    
    const chartOptions: DeepPartial<ChartOptions> = {
      width: this.container.clientWidth || 800,
      height: this.container.clientHeight || 450,
      layout: {
        background: { color: isDark ? "#111418" : "#ffffff" },
        textColor: isDark ? "#848e9c" : "#111827",
      },
      grid: {
        vertLines: { color: isDark ? "rgba(43, 49, 57, 0.4)" : "rgba(229, 231, 235, 0.5)" },
        horzLines: { color: isDark ? "rgba(43, 49, 57, 0.4)" : "rgba(229, 231, 235, 0.5)" },
      },
      crosshair: {
        mode: 1, // Normal crosshair mode
        vertLine: {
          color: isDark ? "#5e6673" : "#9ca3af",
          labelBackgroundColor: isDark ? "#2b3139" : "#f3f4f6",
        },
        horzLine: {
          color: isDark ? "#5e6673" : "#9ca3af",
          labelBackgroundColor: isDark ? "#2b3139" : "#f3f4f6",
        },
      },
      rightPriceScale: {
        borderColor: isDark ? "#2b3139" : "rgba(209, 213, 219, 0.5)",
      },
      timeScale: {
        borderColor: isDark ? "#2b3139" : "rgba(209, 213, 219, 0.5)",
        timeVisible: true,
        secondsVisible: false,
      },
    };

    this.chart = createChart(this.container, chartOptions);

    this.candlestickSeries = this.chart.addCandlestickSeries({
      upColor: "#0ecb81", // brand-green
      downColor: "#f6465d", // brand-red
      borderUpColor: "#0ecb81",
      borderDownColor: "#f6465d",
      wickUpColor: "#0ecb81",
      wickDownColor: "#f6465d",
    });
  }

  /**
   * Resizes the chart container
   */
  public resize(width: number, height: number): void {
    if (this.chart) {
      this.chart.resize(width, height);
    }
  }

  /**
   * Sets new candles data to the chart
   */
  public setCandles(candles: Candle[]): void {
    if (!this.candlestickSeries) {
      return;
    }

    // Sort original candles first to ensure strict chronological order
    const sortedCandles = [...candles].sort((a, b) => {
      const timeA = Date.parse(a.time);
      const timeB = Date.parse(b.time);
      return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
    });

    const chartData: CandlestickData<Time>[] = sortedCandles.map((c) => {
      let chartTime: Time;
      // If time format is exactly YYYY-MM-DD, pass it as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(c.time)) {
        chartTime = c.time;
      } else {
        const parsed = Date.parse(c.time);
        if (!isNaN(parsed)) {
          // Convert milliseconds to seconds for intra-day timestamps
          chartTime = (parsed / 1000) as Time;
        } else {
          chartTime = c.time as Time;
        }
      }

      return {
        time: chartTime,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      };
    });

    this.candlestickSeries.setData(chartData);
  }

  /**
   * Destroys the chart instance
   */
  public destroy(): void {
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
      this.candlestickSeries = null;
    }
  }

  /**
   * Placeholder method to add indicator (not implemented in Sprint 3)
   */
  public addIndicator(type: string, options?: Record<string, unknown>): void {
    // Intentionally left empty as per Sprint 3 guidelines
    console.log(`addIndicator placeholder called: ${type}`, options);
  }

  /**
   * Placeholder method to remove indicator (not implemented in Sprint 3)
   */
  public removeIndicator(id: string): void {
    // Intentionally left empty as per Sprint 3 guidelines
    console.log(`removeIndicator placeholder called: ${id}`);
  }

  /**
   * Placeholder method to add drawing (not implemented in Sprint 3)
   */
  public addDrawing(type: string, options?: Record<string, unknown>): void {
    // Intentionally left empty as per Sprint 3 guidelines
    console.log(`addDrawing placeholder called: ${type}`, options);
  }

  /**
   * Placeholder method to remove drawing (not implemented in Sprint 3)
   */
  public removeDrawing(id: string): void {
    // Intentionally left empty as per Sprint 3 guidelines
    console.log(`removeDrawing placeholder called: ${id}`);
  }
}
