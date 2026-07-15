import path from "path";
import { createServer as createViteServer } from "vite";
import app from "./apps/api/src/app.ts";

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
    app.use(vite.middlewares);
  } else {
    console.log("[TradeFlow] Starting production server...");
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static files from compiled dist folder
    app.use(app.get("express").static(distPath));
    
    // SPA fallback route
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TradeFlow] Core Engine online. Port: ${PORT}`);
    console.log(`[TradeFlow] Access url: http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("[TradeFlow] Engine failed to start:", error);
});
