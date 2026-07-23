import { SimulationClock } from '../timeline/SimulationClock.ts';
import { BacktestState, PlaybackSpeed } from '../types/index.ts';

export class PlaybackController {
  private clock: SimulationClock;
  private speed: PlaybackSpeed = 'UNLIMITED';
  private state: BacktestState = 'IDLE';

  constructor(clock: SimulationClock) {
    this.clock = clock;
  }

  public getState(): BacktestState {
    return this.state;
  }

  public setState(state: BacktestState): void {
    this.state = state;
  }

  public getSpeed(): PlaybackSpeed {
    return this.speed;
  }

  public setSpeed(speed: PlaybackSpeed): void {
    this.speed = speed;
  }

  public play(startIndex: number = 0): void {
    this.clock.start(startIndex);
    this.state = 'RUNNING';
  }

  public pause(): void {
    this.clock.pause();
    this.state = 'PAUSED';
  }

  public resume(): void {
    this.clock.resume();
    this.state = 'RUNNING';
  }

  public stop(): void {
    this.clock.stop();
    this.state = 'STOPPED';
  }

  public stepForward(): boolean {
    const ok = this.clock.next();
    if (!ok) {
      this.state = 'COMPLETED';
    }
    return ok;
  }

  public stepBackward(): boolean {
    return this.clock.previous();
  }

  public seek(index: number): boolean {
    return this.clock.seek(index);
  }

  public replay(): void {
    this.clock.reset();
    this.clock.start(0);
    this.state = 'RUNNING';
  }

  public fastForward(): void {
    this.speed = 'UNLIMITED';
  }
}
