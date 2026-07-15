import express from "express";
import apiRouter from "./routes/index.ts";
import { errorHandler } from "./middleware/error.ts";

const app = express();

// Set up security and request payload middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register api endpoints
app.use("/api", apiRouter);

// Set up custom error handling middleware
app.use(errorHandler);

export default app;
