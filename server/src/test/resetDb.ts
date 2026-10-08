import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { env } from "../config/env.js";

export function assertTestDatabase(connectionString: string): void {
  let databaseName: string;

  try {
    databaseName = new URL(connectionString).pathname.slice(1);
  } catch {
    throw new Error(
      `Refusing to reset: "${connectionString}" is not a valid connection string.`,
    );
  }

  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `Refusing to reset the "${databaseName}" database — only databases whose name ends in "_test" may be truncated.`,
    );
  }
}

export async function resetDb(): Promise<void> {
  assertTestDatabase(env.DATABASE_URL);

  const { rows } = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );

  if (rows.length === 0) return;

  // Table names cannot be parameterised, so this is interpolated — safe here
  // because the names come from the database's own catalogue, never from input.
  const tables = rows.map((row) => `"${row.tablename}"`).join(", ");
  await db.execute(
    sql.raw(`truncate table ${tables} restart identity cascade`),
  );
}
