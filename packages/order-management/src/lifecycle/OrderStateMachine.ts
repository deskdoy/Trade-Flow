import { OMSOrderState } from '../types/index.ts';

export class OrderStateMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<OMSOrderState, OMSOrderState[]> = {
    [OMSOrderState.NEW]: [OMSOrderState.PENDING, OMSOrderState.REJECTED],
    [OMSOrderState.PENDING]: [OMSOrderState.APPROVED, OMSOrderState.REJECTED, OMSOrderState.CANCELLED],
    [OMSOrderState.APPROVED]: [OMSOrderState.ROUTED, OMSOrderState.REJECTED, OMSOrderState.FAILED],
    [OMSOrderState.ROUTED]: [
      OMSOrderState.FILLED,
      OMSOrderState.PARTIALLY_FILLED,
      OMSOrderState.CANCELLED,
      OMSOrderState.EXPIRED,
      OMSOrderState.FAILED,
    ],
    [OMSOrderState.PARTIALLY_FILLED]: [
      OMSOrderState.FILLED,
      OMSOrderState.CANCELLED,
      OMSOrderState.EXPIRED,
      OMSOrderState.FAILED,
    ],
    [OMSOrderState.REJECTED]: [],
    [OMSOrderState.FILLED]: [],
    [OMSOrderState.CANCELLED]: [],
    [OMSOrderState.EXPIRED]: [],
    [OMSOrderState.FAILED]: [],
  };

  /**
   * Checks whether a state transition is allowed
   */
  public static canTransition(from: OMSOrderState, to: OMSOrderState): boolean {
    if (from === to) return true;
    const allowed = this.ALLOWED_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Validates state transition and throws error or returns boolean if invalid
   */
  public static validateTransition(from: OMSOrderState, to: OMSOrderState): boolean {
    if (!this.canTransition(from, to)) {
      throw new Error(`Invalid order state transition from ${from} to ${to}`);
    }
    return true;
  }

  /**
   * Checks if state is terminal
   */
  public static isTerminalState(state: OMSOrderState): boolean {
    return [
      OMSOrderState.REJECTED,
      OMSOrderState.FILLED,
      OMSOrderState.CANCELLED,
      OMSOrderState.EXPIRED,
      OMSOrderState.FAILED,
    ].includes(state);
  }

  /**
   * Checks if order can be cancelled
   */
  public static isCancellableState(state: OMSOrderState): boolean {
    return [
      OMSOrderState.PENDING,
      OMSOrderState.APPROVED,
      OMSOrderState.ROUTED,
      OMSOrderState.PARTIALLY_FILLED,
    ].includes(state);
  }
}
