import {
  AcknowledgementStatus,
  ExecutionAcknowledgementData,
  ExecutionRequest,
} from '../types/index.ts';

export class ExecutionAcknowledgement {
  /**
   * Creates an ACCEPTED acknowledgement
   */
  public static accept(
    request: ExecutionRequest,
    targetId: string,
    message: string = 'Execution request accepted by target'
  ): ExecutionAcknowledgementData {
    return {
      requestId: request.requestId,
      targetId,
      status: AcknowledgementStatus.ACCEPTED,
      timestamp: new Date().toISOString(),
      message,
    };
  }

  /**
   * Creates a REJECTED acknowledgement
   */
  public static reject(
    request: ExecutionRequest,
    targetId: string,
    reasons: string[] = ['Execution request rejected by target']
  ): ExecutionAcknowledgementData {
    return {
      requestId: request.requestId,
      targetId,
      status: AcknowledgementStatus.REJECTED,
      timestamp: new Date().toISOString(),
      message: reasons.join('; '),
      rejectionReasons: reasons,
    };
  }

  /**
   * Creates a PENDING acknowledgement
   */
  public static pending(
    request: ExecutionRequest,
    targetId: string,
    message: string = 'Execution request pending target processing'
  ): ExecutionAcknowledgementData {
    return {
      requestId: request.requestId,
      targetId,
      status: AcknowledgementStatus.PENDING,
      timestamp: new Date().toISOString(),
      message,
    };
  }

  /**
   * Creates a TIMEOUT acknowledgement
   */
  public static timeout(
    request: ExecutionRequest,
    targetId: string,
    message: string = 'Execution request timed out'
  ): ExecutionAcknowledgementData {
    return {
      requestId: request.requestId,
      targetId,
      status: AcknowledgementStatus.TIMEOUT,
      timestamp: new Date().toISOString(),
      message,
    };
  }

  /**
   * Creates a FAILED acknowledgement
   */
  public static fail(
    request: ExecutionRequest,
    targetId: string,
    error: string = 'Execution target failure'
  ): ExecutionAcknowledgementData {
    return {
      requestId: request.requestId,
      targetId,
      status: AcknowledgementStatus.FAILED,
      timestamp: new Date().toISOString(),
      message: error,
    };
  }
}
