import { OptimizationResultItem } from '../types/index.ts';

export interface OptimizationCacheProvider {
  get(hash: string): OptimizationResultItem | undefined;
  set(hash: string, result: OptimizationResultItem): void;
  has(hash: string): boolean;
  clear(): void;
}

export class InMemoryOptimizationCache implements OptimizationCacheProvider {
  private cache: Map<string, OptimizationResultItem> = new Map();

  public get(hash: string): OptimizationResultItem | undefined {
    const item = this.cache.get(hash);
    if (!item) return undefined;
    return { ...item };
  }

  public set(hash: string, result: OptimizationResultItem): void {
    this.cache.set(hash, { ...result });
  }

  public has(hash: string): boolean {
    return this.cache.has(hash);
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}
