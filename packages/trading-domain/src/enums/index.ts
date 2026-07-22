export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum OrderType {
  LIMIT = 'LIMIT',
  MARKET = 'MARKET',
  STOP_LOSS = 'STOP_LOSS',
  TAKE_PROFIT = 'TAKE_PROFIT',
  STOP_LIMIT = 'STOP_LIMIT',
}

export enum OrderStatus {
  NEW = 'NEW',
  PENDING = 'PENDING',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CLOSED = 'CLOSED',
}

export enum PositionSide {
  LONG = 'LONG',
  SHORT = 'SHORT',
  BOTH = 'BOTH',
}

export enum TimeInForce {
  GTC = 'GTC',
  IOC = 'IOC',
  FOK = 'FOK',
  DAY = 'DAY',
}

export enum MarginMode {
  ISOLATED = 'ISOLATED',
  CROSS = 'CROSS',
}
