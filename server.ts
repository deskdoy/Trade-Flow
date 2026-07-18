import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import app from "./apps/api/src/app.ts";

// Handle nested default exports from ESM/CJS interop
let expressApp = app;
while (expressApp && typeof expressApp !== "function" && (expressApp as any).default) {
  expressApp = (expressApp as any).default;
}

async function startServer() {
  const PORT = 3000;

  // Mount Vite development server as middleware if not in production
  if (process.env.NODE_ENV !== "production") {
    console.log("[TradeFlow] Starting development server with Vite middleware...");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false, // Disabled inside sandbox environment to prevent asset flicker
      },
      appType: "spa",
    });
    
    // Inject Vite middleware into our Express app instance
    expressApp.use(vite.middlewares);
  } else {
    console.log("[TradeFlow] Starting production server...");
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static files from compiled dist folder
    expressApp.use(express.static(distPath));
    
    // SPA fallback route
    expressApp.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  expressApp.listen(PORT, "0.0.0.0", () => {
    console.log(`[TradeFlow] Core Engine online. Port: ${PORT}`);
    console.log(`[TradeFlow] Access url: http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("[TradeFlow] Engine failed to start:", error);
});
