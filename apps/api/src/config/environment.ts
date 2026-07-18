import dotenv from "dotenv";

dotenv.config();

export const environment = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  appName: "TradeFlow API",
  apiVersion: "v1",
  allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["*"],
  databaseUrl: process.env.DATABASE_URL || "",
};
