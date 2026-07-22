import { SymbolConfig } from '../types/index.ts';

export class SymbolModel implements SymbolConfig {
  public readonly id: string;
  public readonly baseAsset: string;
  public readonly quoteAsset: string;
  public readonly pricePrecision: number;
  public readonly quantityPrecision: number;
  public readonly minQuantity: number;
  public readonly maxQuantity: number;
  public readonly stepSize: number;
  public readonly minNotional: number;
  public readonly status: 'TRADING' | 'HALTED' | 'BREAK';

  constructor(config: SymbolConfig) {
    this.id = config.id;
    this.baseAsset = config.baseAsset;
    this.quoteAsset = config.quoteAsset;
    this.pricePrecision = config.pricePrecision;
    this.quantityPrecision = config.quantityPrecision;
    this.minQuantity = config.minQuantity;
    this.maxQuantity = config.maxQuantity;
    this.stepSize = config.stepSize;
    this.minNotional = config.minNotional;
    this.status = config.status;
  }

  public toJSON(): SymbolConfig {
    return {
      id: this.id,
      baseAsset: this.baseAsset,
      quoteAsset: this.quoteAsset,
      pricePrecision: this.pricePrecision,
      quantityPrecision: this.quantityPrecision,
      minQuantity: this.minQuantity,
      maxQuantity: this.maxQuantity,
      stepSize: this.stepSize,
      minNotional: this.minNotional,
      status: this.status,
    };
  }

  public formatPrice(price: number): number {
    return Number(price.toFixed(this.pricePrecision));
  }

  public formatQuantity(quantity: number): number {
    return Number(quantity.toFixed(this.quantityPrecision));
  }
}
