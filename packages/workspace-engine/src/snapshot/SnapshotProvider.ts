export interface SnapshotProvider<T = unknown> {
  readonly id: string;
  takeSnapshot(): T;
  restoreSnapshot(snapshot: T): void;
}
