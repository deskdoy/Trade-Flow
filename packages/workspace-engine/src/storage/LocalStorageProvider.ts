import { WorkspaceStorageProvider } from './WorkspaceStorage.ts';

export class LocalStorageProvider implements WorkspaceStorageProvider {
  private prefix: string;
  private memoryStore: Map<string, string> = new Map();
  private isBrowserLocalStorageAvailable: boolean;

  constructor(prefix: string = 'tradeflow_workspace_') {
    this.prefix = prefix;
    this.isBrowserLocalStorageAvailable = typeof window !== 'undefined' && !!window.localStorage;
  }

  private getFullKey(key: string): string {
    return key.startsWith(this.prefix) ? key : `${this.prefix}${key}`;
  }

  public getItem(key: string): string | null {
    const fullKey = this.getFullKey(key);
    if (this.isBrowserLocalStorageAvailable) {
      try {
        return window.localStorage.getItem(fullKey);
      } catch (err) {
        console.warn('[LocalStorageProvider] LocalStorage access failed:', err);
      }
    }
    return this.memoryStore.get(fullKey) ?? null;
  }

  public setItem(key: string, value: string): void {
    const fullKey = this.getFullKey(key);
    if (this.isBrowserLocalStorageAvailable) {
      try {
        window.localStorage.setItem(fullKey, value);
        return;
      } catch (err) {
        console.warn('[LocalStorageProvider] LocalStorage setItem failed:', err);
      }
    }
    this.memoryStore.set(fullKey, value);
  }

  public removeItem(key: string): void {
    const fullKey = this.getFullKey(key);
    if (this.isBrowserLocalStorageAvailable) {
      try {
        window.localStorage.removeItem(fullKey);
      } catch (err) {
        console.warn('[LocalStorageProvider] LocalStorage removeItem failed:', err);
      }
    }
    this.memoryStore.delete(fullKey);
  }

  public keys(): string[] {
    const matchedKeys: string[] = [];
    if (this.isBrowserLocalStorageAvailable) {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(this.prefix)) {
            matchedKeys.push(k.substring(this.prefix.length));
          }
        }
        return matchedKeys;
      } catch (err) {
        console.warn('[LocalStorageProvider] LocalStorage keys access failed:', err);
      }
    }

    for (const k of this.memoryStore.keys()) {
      if (k.startsWith(this.prefix)) {
        matchedKeys.push(k.substring(this.prefix.length));
      }
    }
    return matchedKeys;
  }

  public clear(): void {
    const allKeys = this.keys();
    for (const key of allKeys) {
      this.removeItem(key);
    }
    this.memoryStore.clear();
  }
}
