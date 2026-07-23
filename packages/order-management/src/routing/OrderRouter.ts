import { ExecutionTarget } from './ExecutionTarget.ts';

export class OrderRouter {
  private targets: Map<string, ExecutionTarget> = new Map();
  private defaultTargetId?: string;

  /**
   * Registers an execution target
   */
  public registerTarget(target: ExecutionTarget): void {
    this.targets.set(target.id, target);
    if (!this.defaultTargetId) {
      this.defaultTargetId = target.id;
    }
  }

  /**
   * Sets the default target ID
   */
  public setDefaultTarget(targetId: string): void {
    if (!this.targets.has(targetId)) {
      throw new Error(`Target '${targetId}' is not registered.`);
    }
    this.defaultTargetId = targetId;
  }

  /**
   * Gets a registered execution target by ID or returns default
   */
  public getTarget(targetId?: string): ExecutionTarget {
    const idToUse = targetId || this.defaultTargetId;
    if (!idToUse) {
      throw new Error('No execution target registered in OrderRouter.');
    }

    const target = this.targets.get(idToUse);
    if (!target) {
      throw new Error(`Execution target '${idToUse}' not found.`);
    }

    return target;
  }

  /**
   * Lists all registered targets
   */
  public listTargets(): ExecutionTarget[] {
    return Array.from(this.targets.values());
  }
}
