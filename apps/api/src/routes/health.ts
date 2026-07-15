import { Router } from "express";
import { HealthController } from "../controllers/health.ts";

const router = Router();

// GET /api/v1/health or /health
router.get("/", HealthController.getHealth);

export default router;
