import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// `id` is the SHA-256 of the session token, never the token itself, so a
// leaked database dump contains no usable cookies. A token is 32 random
// bytes, so there is nothing to brute-force and a fast hash is the right
// tool here — unlike a password, which gets argon2.
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  // Postgres indexes the primary key but not the foreign key. Logout-everywhere
  // and the expired-session sweep both query by user, not by id.
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);
