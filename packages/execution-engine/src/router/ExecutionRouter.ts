import { ExecutionTarget } from '../targets/ExecutionTarget.ts';
import { ExecutionRequest, ExecutionTargetType } from '../types/index.ts';

export class ExecutionRouter {
  private targetsById: Map<string, ExecutionTarget> = new Map();
  private defaultTargetId?: string;

  /**
   * Registers an execution target
   */
  public registerTarget(target: ExecutionTarget): void {
    this.targetsById.set(target.id, target);
    if (!this.defaultTargetId) {
      this.defaultTargetId = target.id;
    }
  }

  /**
   * Unregisters an execution target
   */
  public unregisterTarget(targetId: string): void {
    this.targetsById.delete(targetId);
    if (this.defaultTargetId === targetId) {
      const remaining = Array.from(this.targetsById.keys());
      this.defaultTargetId = remaining[0];
    }
  }

  /**
   * Sets the default execution target ID
   */
  public setDefaultTarget(targetId: string): void {
    if (!this.targetsById.has(targetId)) {
      throw new Error(`Execution target '${targetId}' is not registered.`);
    }
    this.defaultTargetId = targetId;
  }

  /**
   * Retrieves a target by ID or throws if not found
   */
  public getTarget(targetId: string): ExecutionTarget {
    const target = this.targetsById.get(targetId);
    if (!target) {
      throw new Error(`Execution target '${targetId}' not found.`);
    }
    return target;
  }

  /**
   * Selects an execution target for a given execution request based on request parameters
   */
  public selectTarget(request: ExecutionRequest): ExecutionTarget {
    // 1. Direct target ID match
    if (request.targetId && this.targetsById.has(request.targetId)) {
      return this.targetsById.get(request.targetId)!;
    }

    // 2. Target type match
    if (request.targetType) {
      const typeMatch = Array.from(this.targetsById.values()).find(
        (t) => t.type === request.targetType && t.isAvailable()
      );
      if (typeMatch) {
        return typeMatch;
      }
    }

    // 3. Fallback to default target
    if (this.defaultTargetId && this.targetsById.has(this.defaultTargetId)) {
      return this.targetsById.get(this.defaultTargetId)!;
    }

    throw new Error('No available execution target found in ExecutionRouter.');
  }

  /**
   * Lists all registered targets
   */
  public listTargets(): ExecutionTarget[] {
    return Array.from(this.targetsById.values());
  }

  /**
   * Clears registered targets
   */
  public clear(): void {
    this.targetsById.clear();
    this.defaultTargetId = undefined;
  }
}
