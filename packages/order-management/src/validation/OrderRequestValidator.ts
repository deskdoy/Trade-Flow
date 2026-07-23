import { OrderSide, OrderType } from '@tradeflow/trading-domain';
import { OrderRequest, OrderValidationResult } from '../types/index.ts';

export class OrderRequestValidator {
  /**
   * Validates structural and semantic rules of an order request
   */
  public validate(request: OrderRequest): OrderValidationResult {
    const reasons: string[] = [];

    // Symbol check
    if (!request.symbol || typeof request.symbol !== 'string' || request.symbol.trim().length === 0) {
      reasons.push('Order request must specify a valid symbol.');
    }

    // Side check
    if (!request.side || (request.side !== OrderSide.BUY && request.side !== OrderSide.SELL)) {
      reasons.push('Order request must specify a valid side (BUY or SELL).');
    }

    // Quantity check
    if (typeof request.quantity !== 'number' || request.quantity <= 0 || Number.isNaN(request.quantity)) {
      reasons.push('Order quantity must be a positive number.');
    }

    // Type checks
    if (!request.type || !Object.values(OrderType).includes(request.type)) {
      reasons.push('Order request must specify a valid OrderType.');
    } else {
      if (request.type === OrderType.LIMIT) {
        if (typeof request.price !== 'number' || request.price <= 0 || Number.isNaN(request.price)) {
          reasons.push('Limit orders require a positive price.');
        }
      }

      if (request.type === OrderType.STOP_LOSS || request.type === OrderType.TAKE_PROFIT) {
        if (typeof request.stopPrice !== 'number' || request.stopPrice <= 0 || Number.isNaN(request.stopPrice)) {
          reasons.push('Stop orders require a positive stopPrice.');
        }
      }

      if (request.type === OrderType.STOP_LIMIT) {
        if (typeof request.stopPrice !== 'number' || request.stopPrice <= 0 || Number.isNaN(request.stopPrice)) {
          reasons.push('Stop-limit orders require a positive stopPrice.');
        }
        if (typeof request.price !== 'number' || request.price <= 0 || Number.isNaN(request.price)) {
          reasons.push('Stop-limit orders require a positive price.');
        }
      }
    }

    // Leverage check
    if (request.leverage !== undefined && (request.leverage < 1 || Number.isNaN(request.leverage))) {
      reasons.push('Leverage must be greater than or equal to 1.');
    }

    return {
      approved: reasons.length === 0,
      reasons,
    };
  }
}
