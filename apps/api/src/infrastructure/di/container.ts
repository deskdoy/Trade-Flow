import { GetHealthUseCase } from "../../application/use-cases/GetHealthUseCase.ts";
import { SystemHealthMonitor } from "../monitoring/SystemHealthMonitor.ts";

export class Container {
  private static healthMonitor = new SystemHealthMonitor();
  private static getHealthUseCase = new GetHealthUseCase(Container.healthMonitor);

  public static getGetHealthUseCase(): GetHealthUseCase {
    return Container.getHealthUseCase;
  }
}
