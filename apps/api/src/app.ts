import express from "express";
import apiRouter from "./interfaces/routes/index.ts";
import { errorHandler } from "./interfaces/middleware/error.ts";

const app = express();

// Set up security and request payload middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register api endpoints
app.use("/api", apiRouter);

// Handle 404 for any unmatched /api routes to prevent HTML fallbacks
app.use("/api/*", (req, res, next) => {
  const err: any = new Error(`API endpoint not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
});

// Set up custom error handling middleware
app.use(errorHandler);

export default app;
