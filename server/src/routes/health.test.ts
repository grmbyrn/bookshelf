import request from "supertest"
import { describe, it, expect, afterAll } from "vitest"
import { app } from "../app.js"
import { pool } from "../db/index.js"

afterAll(() => pool.end())

describe("GET /api/health", () => {
  it("reports ok when the database is reachable", async () => {
    const res = await request(app).get("/api/health")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: "ok", database: "connected" })
  })

  it("returns a JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/api/nope")
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe("NOT_FOUND")
  })
})
