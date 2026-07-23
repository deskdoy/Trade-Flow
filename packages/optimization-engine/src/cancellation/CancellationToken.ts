export class CancellationToken {
  private cancelled: boolean = false;
  private paused: boolean = false;

  public cancel(): void {
    this.cancelled = true;
  }

  public pause(): void {
    this.paused = true;
  }

  public resume(): void {
    this.paused = false;
  }

  public isCancelled(): boolean {
    return this.cancelled;
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public reset(): void {
    this.cancelled = false;
    this.paused = false;
  }
}
