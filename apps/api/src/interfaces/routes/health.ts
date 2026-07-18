import { Router } from "express";
import { HealthController } from "../controllers/HealthController.ts";

const router = Router();

router.get("/", HealthController.getHealth);

export default router;
