import type { Express } from "express";
import { createServer, type Server } from "http";
import type { HealthResponse } from "./types";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    const response: HealthResponse = {
      status: "ok",
      timestamp: new Date().toISOString()
    };
    res.json(response);
  });

  const httpServer = createServer(app);
  return httpServer;
}
