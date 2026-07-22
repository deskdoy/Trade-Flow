import { OrderSide, OrderType } from '../enums/index.ts';
import { OrderData, SymbolConfig, ValidationError, ValidationResult } from '../types/index.ts';

export class OrderValidator {
  public validate(order: Partial<OrderData>, symbolConfig?: SymbolConfig): ValidationResult {
    const errors: ValidationError[] = [];

    // Symbol check
    if (!order.symbol || typeof order.symbol !== 'string' || order.symbol.trim() === '') {
      errors.push({ field: 'symbol', message: 'Order symbol is required' });
    }

    // Side check
    if (!order.side || !Object.values(OrderSide).includes(order.side)) {
      errors.push({ field: 'side', message: `Invalid order side: ${String(order.side)}` });
    }

    // Type check
    if (!order.type || !Object.values(OrderType).includes(order.type)) {
      errors.push({ field: 'type', message: `Invalid order type: ${String(order.type)}` });
    }

    // Quantity check
    if (typeof order.quantity !== 'number' || !isFinite(order.quantity) || order.quantity <= 0) {
      errors.push({ field: 'quantity', message: 'Quantity must be a positive finite number' });
    }

    // Price requirement for LIMIT and STOP_LIMIT
    if (order.type === OrderType.LIMIT || order.type === OrderType.STOP_LIMIT) {
      if (typeof order.price !== 'number' || !isFinite(order.price) || order.price <= 0) {
        errors.push({ field: 'price', message: `Price is required for ${order.type} orders and must be a positive number` });
      }
    }

    // StopPrice requirement for STOP_LOSS, TAKE_PROFIT, and STOP_LIMIT
    if (
      order.type === OrderType.STOP_LOSS ||
      order.type === OrderType.TAKE_PROFIT ||
      order.type === OrderType.STOP_LIMIT
    ) {
      if (typeof order.stopPrice !== 'number' || !isFinite(order.stopPrice) || order.stopPrice <= 0) {
        errors.push({ field: 'stopPrice', message: `Stop price is required for ${order.type} orders and must be a positive number` });
      }
    }

    // Symbol constraints validation
    if (symbolConfig && typeof order.quantity === 'number' && isFinite(order.quantity) && order.quantity > 0) {
      if (symbolConfig.status !== 'TRADING') {
        errors.push({ field: 'symbol', message: `Symbol ${symbolConfig.id} is not open for trading (status: ${symbolConfig.status})` });
      }

      if (order.quantity < symbolConfig.minQuantity) {
        errors.push({ field: 'quantity', message: `Quantity ${order.quantity} is below minimum allowed ${symbolConfig.minQuantity}` });
      }

      if (order.quantity > symbolConfig.maxQuantity) {
        errors.push({ field: 'quantity', message: `Quantity ${order.quantity} exceeds maximum allowed ${symbolConfig.maxQuantity}` });
      }

      // Check minNotional if price is available
      const priceToCheck = order.price ?? order.stopPrice;
      if (typeof priceToCheck === 'number' && isFinite(priceToCheck) && priceToCheck > 0) {
        const notional = priceToCheck * order.quantity;
        if (notional < symbolConfig.minNotional) {
          errors.push({ field: 'notional', message: `Order notional value ${notional} is below minimum allowed ${symbolConfig.minNotional}` });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
