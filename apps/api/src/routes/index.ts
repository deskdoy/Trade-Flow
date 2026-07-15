import { Router } from "express";
import healthRouter from "./health.ts";
import tradingRouter from "./trading.ts";

const router = Router();

// Register sub-routers
router.use("/health", healthRouter);
router.use("/trade", tradingRouter);

export default router;
