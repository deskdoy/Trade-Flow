import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, DeepPartial, ChartOptions } from "lightweight-charts";
import { Candle } from "@tradeflow/shared";

export class ChartEngine {
  private chart: IChartApi | null = null;
  private candlestickSeries: ISeriesApi<"Candlestick"> | null = null;
  private lineSeries: Map<string, ISeriesApi<"Line">> = new Map();
  private drawingSeries: Map<string, ISeriesApi<"Line">> = new Map();
  private candleTimes: string[] = [];
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

    this.candleTimes = sortedCandles.map((c) => c.time);
    this.candlestickSeries.setData(chartData);
  }

  /**
   * Subscribes to chart clicks and maps them to price & time
   */
  public subscribeClick(callback: (price: number, time: string) => void): () => void {
    if (!this.chart || !this.candlestickSeries) {
      return () => {};
    }

    const handler = (param: any) => {
      if (!param.point || !param.time) {
        return;
      }
      const price = this.candlestickSeries!.coordinateToPrice(param.point.y);
      if (price !== null) {
        let timeStr = "";
        if (typeof param.time === "object" && param.time !== null) {
          const t = param.time as any;
          const mm = String(t.month).padStart(2, "0");
          const dd = String(t.day).padStart(2, "0");
          timeStr = `${t.year}-${mm}-${dd}`;
        } else if (typeof param.time === "number") {
          const date = new Date(param.time * 1000);
          timeStr = date.toISOString().split("T")[0];
        } else {
          timeStr = String(param.time);
        }
        callback(parseFloat(price.toFixed(4)), timeStr);
      }
    };

    this.chart.subscribeClick(handler);

    return () => {
      if (this.chart) {
        this.chart.unsubscribeClick(handler);
      }
    };
  }

  /**
   * Destroys the chart instance
   */
  public destroy(): void {
    if (this.chart) {
      this.clearLineSeries();
      this.clearDrawings();
      this.chart.remove();
      this.chart = null;
      this.candlestickSeries = null;
    }
  }

  /**
   * Sets or updates a line series on the chart for an indicator.
   */
  public setLineSeries(
    id: string,
    points: { time: string; value: number }[],
    options?: { color?: string; lineWidth?: number }
  ): void {
    if (!this.chart) {
      return;
    }

    let series = this.lineSeries.get(id);
    if (!series) {
      series = this.chart.addLineSeries({
        color: options?.color || "#2196F3",
        lineWidth: (options?.lineWidth || 2) as any,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      this.lineSeries.set(id, series);
    } else if (options) {
      series.applyOptions({
        color: options.color,
        lineWidth: options.lineWidth as any,
      });
    }

    const seriesData = points.map((p) => {
      let chartTime: Time;
      if (/^\d{4}-\d{2}-\d{2}$/.test(p.time)) {
        chartTime = p.time;
      } else {
        const parsed = Date.parse(p.time);
        if (!isNaN(parsed)) {
          chartTime = (parsed / 1000) as Time;
        } else {
          chartTime = p.time as Time;
        }
      }

      return {
        time: chartTime,
        value: p.value,
      };
    });

    series.setData(seriesData);
  }

  /**
   * Removes a line series from the chart.
   */
  public removeLineSeries(id: string): void {
    const series = this.lineSeries.get(id);
    if (series && this.chart) {
      this.chart.removeSeries(series);
      this.lineSeries.delete(id);
    }
  }

  /**
   * Clears all indicator line series.
   */
  public clearLineSeries(): void {
    if (this.chart) {
      for (const series of this.lineSeries.values()) {
        this.chart.removeSeries(series);
      }
    }
    this.lineSeries.clear();
  }

  /**
   * Synchronizes the displayed indicator lines with active indicators
   */
  public syncIndicators(
    indicators: { id: string; color: string; points: { time: string; value: number }[] }[]
  ): void {
    const activeIds = new Set(indicators.map((ind) => ind.id));

    // Remove any line series that are no longer active
    for (const id of Array.from(this.lineSeries.keys())) {
      if (!activeIds.has(id)) {
        this.removeLineSeries(id);
      }
    }

    // Add or update active line series
    for (const ind of indicators) {
      this.setLineSeries(ind.id, ind.points, { color: ind.color, lineWidth: 2 });
    }
  }

  /**
   * Synchronizes drawings on the chart
   */
  public syncDrawings(
    drawings: { id: string; type: string; points: { time: string; price: number }[]; color: string; lineWidth: number; selected: boolean }[]
  ): void {
    const activeIds = new Set(drawings.map((d) => d.id));

    // Remove any series no longer active
    for (const id of Array.from(this.drawingSeries.keys())) {
      if (!activeIds.has(id)) {
        this.removeDrawing(id);
      }
    }

    // Add or update active series
    for (const d of drawings) {
      this.addDrawing(d.id, d.type, d.points, {
        color: d.color,
        lineWidth: d.lineWidth,
        selected: d.selected,
      });
    }
  }

  /**
   * Placeholder method to add indicator (not implemented in Sprint 3)
   */
  public addIndicator(type: string, options?: Record<string, unknown>): void {
    // Deprecated in favor of packages/indicators package and syncIndicators
    console.log(`addIndicator placeholder called: ${type}`, options);
  }

  /**
   * Placeholder method to remove indicator (not implemented in Sprint 3)
   */
  public removeIndicator(id: string): void {
    // Deprecated in favor of packages/indicators package and syncIndicators
    console.log(`removeIndicator placeholder called: ${id}`);
  }

  /**
   * Adds or updates a drawing series on the chart.
   */
  public addDrawing(
    id: string,
    type: string,
    points: { time: string; price: number }[],
    options?: { color?: string; lineWidth?: number; selected?: boolean }
  ): void {
    if (!this.chart) {
      return;
    }

    if (this.drawingSeries.has(id)) {
      this.updateDrawing(id, points, options);
      return;
    }

    const isSelected = options?.selected || false;
    const series = this.chart.addLineSeries({
      color: options?.color || "#10b981",
      lineWidth: ((options?.lineWidth || 2) + (isSelected ? 2 : 0)) as any,
      lineStyle: isSelected ? 1 : 0, // dashed if selected, solid otherwise
      priceLineVisible: false,
      lastValueVisible: false,
    });

    this.drawingSeries.set(id, series);
    this.updateDrawing(id, points, options);
  }

  /**
   * Updates a drawing series' positions and styling on the chart.
   */
  public updateDrawing(
    id: string,
    points: { time: string; price: number }[],
    options?: { color?: string; lineWidth?: number; selected?: boolean }
  ): void {
    const series = this.drawingSeries.get(id);
    if (!series) {
      return;
    }

    if (options) {
      const isSelected = options.selected || false;
      series.applyOptions({
        color: options.color,
        lineWidth: ((options.lineWidth || 2) + (isSelected ? 2 : 0)) as any,
        lineStyle: isSelected ? 1 : 0,
      });
    }

    const isHorizontal = points.length === 1 || points[0]?.time === "";
    let dataPoints = points;
    if (isHorizontal && this.candleTimes.length > 0 && points[0]) {
      dataPoints = [
        { time: this.candleTimes[0], price: points[0].price },
        { time: this.candleTimes[this.candleTimes.length - 1], price: points[0].price },
      ];
    }

    const seriesData = dataPoints.map((p) => {
      let chartTime: Time;
      if (/^\d{4}-\d{2}-\d{2}$/.test(p.time)) {
        chartTime = p.time;
      } else {
        const parsed = Date.parse(p.time);
        if (!isNaN(parsed)) {
          chartTime = (parsed / 1000) as Time;
        } else {
          chartTime = p.time as Time;
        }
      }

      return {
        time: chartTime,
        value: p.price,
      };
    });

    // Ensure strictly ordered data for lightweight-charts
    seriesData.sort((a, b) => {
      const tA = typeof a.time === "number" ? a.time : Date.parse(a.time as string);
      const tB = typeof b.time === "number" ? b.time : Date.parse(b.time as string);
      return tA - tB;
    });

    series.setData(seriesData);
  }

  /**
   * Removes a drawing from the chart.
   */
  public removeDrawing(id: string): void {
    const series = this.drawingSeries.get(id);
    if (series && this.chart) {
      this.chart.removeSeries(series);
      this.drawingSeries.delete(id);
    }
  }

  /**
   * Clears all drawings from the chart.
   */
  public clearDrawings(): void {
    if (this.chart) {
      for (const series of this.drawingSeries.values()) {
        this.chart.removeSeries(series);
      }
    }
    this.drawingSeries.clear();
  }
}
