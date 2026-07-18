export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[TradeFlow] [INFO] [${new Date().toISOString()}] ${message}`, ...args);
  },
  error: (message: string, error?: any, ...args: any[]) => {
    console.error(`[TradeFlow] [ERROR] [${new Date().toISOString()}] ${message}`, ...args);
    if (error && error.stack) {
      console.error(error.stack);
    }
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[TradeFlow] [WARN] [${new Date().toISOString()}] ${message}`, ...args);
  }
};
