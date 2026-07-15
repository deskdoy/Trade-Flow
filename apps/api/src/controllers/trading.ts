import { Request, Response, NextFunction } from "express";
import { TradingService } from "../services/trading.ts";
import { OrderType, OrderSide } from "@/packages/shared/src/types/index";

export class TradingController {
  public static getTickers(req: Request, res: Response, next: NextFunction): void {
    try {
      const tickers = TradingService.getTickers();
      res.status(200).json({ success: true, data: tickers });
    } catch (err) {
      next(err);
    }
  }

  public static getAccount(req: Request, res: Response, next: NextFunction): void {
    try {
      const account = TradingService.getAccount();
      res.status(200).json({ success: true, data: account });
    } catch (err) {
      next(err);
    }
  }

  public static getPositions(req: Request, res: Response, next: NextFunction): void {
    try {
      const positions = TradingService.getPositions();
      res.status(200).json({ success: true, data: positions });
    } catch (err) {
      next(err);
    }
  }

  public static getOrders(req: Request, res: Response, next: NextFunction): void {
    try {
      const orders = TradingService.getOrders();
      res.status(200).json({ success: true, data: orders });
    } catch (err) {
      next(err);
    }
  }

  public static createOrder(req: Request, res: Response, next: NextFunction): void {
    try {
      const { symbol, type, side, price, quantity } = req.body;

      if (!symbol || !type || !side || !quantity) {
        res.status(400).json({
          success: false,
          error: "Missing required order fields: symbol, type, side, quantity"
        });
        return;
      }

      const orderPrice = price ? Number(price) : 0;
      const orderQuantity = Number(quantity);

      const order = TradingService.createOrder(
        symbol,
        type as OrderType,
        side as OrderSide,
        orderPrice,
        orderQuantity
      );

      res.status(201).json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }

  public static cancelOrder(req: Request, res: Response, next: NextFunction): void {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: "Missing order ID parameter" });
        return;
      }

      const cancelled = TradingService.cancelOrder(id);
      if (cancelled) {
        res.status(200).json({ success: true, message: "Order cancelled successfully" });
      } else {
        res.status(400).json({ success: false, error: "Order could not be cancelled or does not exist" });
      }
    } catch (err) {
      next(err);
    }
  }
}
