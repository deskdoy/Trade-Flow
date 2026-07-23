import { Strategy } from '../types/index.ts';

export class StrategyRegistry {
  private strategies: Map<string, Strategy> = new Map();

  /**
   * Registers a strategy instance
   */
  public register(strategy: Strategy): void {
    if (!strategy.metadata?.id) {
      throw new Error('Strategy metadata must include a valid id');
    }
    if (this.strategies.has(strategy.metadata.id)) {
      throw new Error(`Strategy with ID "${strategy.metadata.id}" is already registered`);
    }
    this.strategies.set(strategy.metadata.id, strategy);
  }

  /**
   * Unregisters a strategy by ID
   */
  public unregister(strategyId: string): boolean {
    return this.strategies.delete(strategyId);
  }

  /**
   * Retrieves a strategy by ID
   */
  public get(strategyId: string): Strategy | undefined {
    return this.strategies.get(strategyId);
  }

  /**
   * Checks if strategy exists by ID
   */
  public has(strategyId: string): boolean {
    return this.strategies.has(strategyId);
  }

  /**
   * Returns all registered strategies
   */
  public getAll(): Strategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Clears all registered strategies
   */
  public clear(): void {
    this.strategies.clear();
  }
}
