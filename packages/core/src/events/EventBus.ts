export type EventCallback<T = any> = (payload: T) => void;

export class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  public on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => this.off(event, callback);
  }

  public off<T = any>(event: string, callback: EventCallback<T>): void {
    const eventSet = this.listeners.get(event);
    if (eventSet) {
      eventSet.delete(callback);
      if (eventSet.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public emit<T = any>(event: string, payload: T): void {
    const eventSet = this.listeners.get(event);
    if (eventSet) {
      for (const callback of eventSet) {
        try {
          callback(payload);
        } catch (err) {
          console.error(`[EventBus] Error handling event "${event}":`, err);
        }
      }
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}
