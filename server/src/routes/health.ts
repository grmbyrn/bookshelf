import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

export const healthRouter = Router();
healthRouter.get("/health", async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});
