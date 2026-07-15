import { Request, Response, NextFunction } from "express";
import { HealthService } from "../services/health.ts";

export class HealthController {
  public static async getHealth(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const status = await HealthService.checkHealth();
      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }
}
