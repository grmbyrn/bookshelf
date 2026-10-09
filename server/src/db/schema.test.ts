import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool } from "./index.js";
import { users, sessions } from "./schema.js";
import { resetDb } from "../test/resetDb.js";

beforeEach(resetDb);
afterAll(() => pool.end());

async function insertUser() {
  const [user] = await db
    .insert(users)
    .values({
      name: "Probe",
      email: "probe@example.com",
      passwordHash: "x",
    })
    .returning();
  if (!user) throw new Error("Could not insert the test user.");
  return user;
}

const anHourFromNow = () => new Date(Date.now() + 60 * 60 * 1000);

describe("sessions", () => {
  it("goes away with the user it belongs to", async () => {
    const user = await insertUser();
    await db
      .insert(sessions)
      .values({ id: "hash-1", userId: user.id, expiresAt: anHourFromNow() });

    await db.delete(users).where(eq(users.id, user.id));

    expect(await db.select().from(sessions)).toHaveLength(0);
  });

  it("cannot belong to a user who does not exist", async () => {
    await expect(
      db.insert(sessions).values({
        id: "hash-2",
        userId: "00000000-0000-0000-0000-000000000000",
        expiresAt: anHourFromNow(),
      }),
    ).rejects.toThrow();
  });
});
