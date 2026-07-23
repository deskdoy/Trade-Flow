export class SignalGenerator {
  /**
   * Checks if series A crossed above series B on the most recent bar
   */
  public static crossAbove(seriesA: number[], seriesB: number[]): boolean {
    if (seriesA.length < 2 || seriesB.length < 2) return false;
    const prevA = seriesA[seriesA.length - 2];
    const currA = seriesA[seriesA.length - 1];
    const prevB = seriesB[seriesB.length - 2];
    const currB = seriesB[seriesB.length - 1];
    return prevA <= prevB && currA > currB;
  }

  /**
   * Checks if series A crossed below series B on the most recent bar
   */
  public static crossBelow(seriesA: number[], seriesB: number[]): boolean {
    if (seriesA.length < 2 || seriesB.length < 2) return false;
    const prevA = seriesA[seriesA.length - 2];
    const currA = seriesA[seriesA.length - 1];
    const prevB = seriesB[seriesB.length - 2];
    const currB = seriesB[seriesB.length - 1];
    return prevA >= prevB && currA < currB;
  }
}
