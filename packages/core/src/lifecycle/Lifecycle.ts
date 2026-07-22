export interface Disposable {
  dispose(): void;
}

export interface Initializable {
  initialize(): Promise<void> | void;
}

export interface Lifecycle extends Initializable, Disposable {
  destroy(): void;
}
