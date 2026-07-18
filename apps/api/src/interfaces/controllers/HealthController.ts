import { Request, Response, NextFunction } from "express";
import { Container } from "../../infrastructure/di/container.ts";

export class HealthController {
  public static async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const useCase = Container.getGetHealthUseCase();
      const health = await useCase.execute();
      res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      next(error);
    }
  }
}
