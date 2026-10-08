import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { db, pool } from "../db/index.js";
import { users } from "../db/schema.js";
import { resetDb } from "./resetDb.js";

beforeEach(resetDb);
afterAll(() => pool.end());

describe("resetDb", () => {
  it("leaves the table empty for the first test", async () => {
    await db.insert(users).values({
      name: "Probe",
      email: "probe@example.com",
      passwordHash: "x",
    });
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it("empties it again, so the same email can be inserted twice", async () => {
    await db.insert(users).values({
      name: "Probe",
      email: "probe@example.com",
      passwordHash: "x",
    });
    expect(await db.select().from(users)).toHaveLength(1);
  });
});
