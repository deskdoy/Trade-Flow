export interface SnapshotProvider<T> {
  getSnapshot(): T;
  restoreSnapshot(snapshot: T): void;
}

export interface EngineHealth {
  healthy: boolean;
  version: string;
  uptime?: number;
  objectCount?: number;
  eventsPublished?: number;
  [key: string]: unknown;
}

export interface EngineLifecycle {
  initialize?(): void | Promise<void>;
  reset?(): void;
  destroy?(): void;
  getVersion(): string;
  getHealth?(): EngineHealth;
}
