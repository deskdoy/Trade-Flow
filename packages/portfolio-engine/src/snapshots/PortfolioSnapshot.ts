import { PortfolioSnapshotData } from '../types/index.ts';

export class PortfolioSnapshot {
  /**
   * Serializes portfolio snapshot payload into JSON string
   */
  public static serialize(snapshot: PortfolioSnapshotData): string {
    return JSON.stringify(snapshot);
  }

  /**
   * Deserializes JSON string into PortfolioSnapshotData payload
   */
  public static deserialize(jsonString: string): PortfolioSnapshotData {
    const data = JSON.parse(jsonString) as PortfolioSnapshotData;

    if (
      !data ||
      !Array.isArray(data.positions) ||
      !Array.isArray(data.closedPositions) ||
      !data.holdings ||
      !data.equity ||
      !data.statistics ||
      !data.performance
    ) {
      throw new Error('Invalid portfolio snapshot format');
    }

    return data;
  }
}
