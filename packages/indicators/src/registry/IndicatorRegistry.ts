import { Indicator, IndicatorDefinition } from "../types/index.ts";
import { SMAIndicator } from "../built-in/SMA.ts";
import { EMAIndicator } from "../built-in/EMA.ts";

export class IndicatorRegistry {
  private static definitions: Map<string, IndicatorDefinition> = new Map();

  static {
    // Pre-register our standard built-in indicators
    IndicatorRegistry.register({
      type: "SMA",
      name: "Simple Moving Average",
      createInstance: (id, parameters) => {
        const period = typeof parameters.period === "number" ? parameters.period : 20;
        return new SMAIndicator(id, { period });
      }
    });

    IndicatorRegistry.register({
      type: "EMA",
      name: "Exponential Moving Average",
      createInstance: (id, parameters) => {
        const period = typeof parameters.period === "number" ? parameters.period : 50;
        return new EMAIndicator(id, { period });
      }
    });
  }

  /**
   * Registers a brand new indicator definition
   */
  public static register(definition: IndicatorDefinition): void {
    IndicatorRegistry.definitions.set(definition.type.toUpperCase(), definition);
  }

  /**
   * Instantiates an indicator of a registered type with specified parameters
   */
  public static create(type: string, id: string, parameters: Record<string, any>): Indicator {
    const definition = IndicatorRegistry.definitions.get(type.toUpperCase());
    if (!definition) {
      throw new Error(`[IndicatorRegistry] Indicator definition type "${type}" is not registered.`);
    }
    return definition.createInstance(id, parameters);
  }

  /**
   * Gets a list of all registered indicator type keys
   */
  public static getRegisteredTypes(): string[] {
    return Array.from(IndicatorRegistry.definitions.keys());
  }
}
