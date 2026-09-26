import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().positive().default(3001),
  CLIENT_URL: z.url().default("http://localhost:5173"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Invalid environment variables:\n",
    z.prettifyError(result.error),
  );
  process.exit(1);
}

export const env = result.data;
export type Env = z.infer<typeof envSchema>;
