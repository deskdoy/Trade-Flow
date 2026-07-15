import { Router } from "express";
import { TradingController } from "../controllers/trading.ts";

const router = Router();

router.get("/tickers", TradingController.getTickers);
router.get("/account", TradingController.getAccount);
router.get("/positions", TradingController.getPositions);
router.get("/orders", TradingController.getOrders);
router.post("/orders", TradingController.createOrder);
router.delete("/orders/:id", TradingController.cancelOrder);

export default router;
