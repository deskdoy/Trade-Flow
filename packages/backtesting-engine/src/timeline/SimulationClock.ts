import { HistoricalDataset } from '../dataset/HistoricalDataset.ts';

export class SimulationClock {
  private dataset: HistoricalDataset;
  private currentIndexValue: number = -1;
  private active: boolean = false;
  private paused: boolean = false;

  constructor(dataset: HistoricalDataset) {
    this.dataset = dataset;
  }

  /**
   * Starts simulation clock at index 0 or specified starting index
   */
  public start(startIndex: number = 0): void {
    if (this.dataset.length() === 0) {
      throw new Error('Cannot start clock on an empty dataset');
    }
    this.currentIndexValue = Math.max(0, Math.min(startIndex, this.dataset.length() - 1));
    this.active = true;
    this.paused = false;
  }

  /**
   * Pauses simulation clock
   */
  public pause(): void {
    if (this.active) {
      this.paused = true;
    }
  }

  /**
   * Resumes simulation clock
   */
  public resume(): void {
    if (this.active) {
      this.paused = false;
    }
  }

  /**
   * Stops simulation clock
   */
  public stop(): void {
    this.active = false;
    this.paused = false;
    this.currentIndexValue = -1;
  }

  /**
   * Seeks simulation clock to specific index
   */
  public seek(index: number): boolean {
    if (index < 0 || index >= this.dataset.length()) {
      return false;
    }
    this.currentIndexValue = index;
    return true;
  }

  /**
   * Advances simulation clock to next candle
   * Returns true if advanced, false if at end
   */
  public next(): boolean {
    if (this.currentIndexValue + 1 >= this.dataset.length()) {
      return false;
    }
    this.currentIndexValue++;
    return true;
  }

  /**
   * Rewinds simulation clock to previous candle
   * Returns true if rewound, false if at beginning
   */
  public previous(): boolean {
    if (this.currentIndexValue <= 0) {
      return false;
    }
    this.currentIndexValue--;
    return true;
  }

  /**
   * Returns simulated current timestamp string
   */
  public currentTime(): string {
    if (this.currentIndexValue < 0 || this.currentIndexValue >= this.dataset.length()) {
      return '';
    }
    const candle = this.dataset.get(this.currentIndexValue);
    return candle ? candle.time : '';
  }

  /**
   * Returns current candle index
   */
  public currentIndex(): number {
    return this.currentIndexValue;
  }

  /**
   * Returns clock state
   */
  public isRunning(): boolean {
    return this.active && !this.paused;
  }

  /**
   * Returns if paused
   */
  public isPaused(): boolean {
    return this.paused;
  }

  /**
   * Resets simulation clock
   */
  public reset(): void {
    this.active = false;
    this.paused = false;
    this.currentIndexValue = -1;
  }
}
