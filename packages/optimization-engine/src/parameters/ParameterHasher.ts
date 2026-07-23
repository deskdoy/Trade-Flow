import { ParameterSet } from '../types/index.ts';

export class ParameterHasher {
  /**
   * Generates a deterministic hash string for a parameter set
   */
  public static hash(parameters: ParameterSet): string {
    const sortedKeys = Object.keys(parameters).sort();
    const sortedObject: Record<string, any> = {};
    for (const key of sortedKeys) {
      sortedObject[key] = parameters[key];
    }
    const jsonString = JSON.stringify(sortedObject);

    // FNV-1a 32-bit hash algorithm
    let hash = 2166136261;
    for (let i = 0; i < jsonString.length; i++) {
      hash ^= jsonString.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
}
