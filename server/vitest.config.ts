import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

const { parsed } = dotenv.config({ path: ".env.test" });

export default defineConfig({
  test: {
    env: parsed,
    // One database, shared by every test file. Vitest runs files in parallel
    // by default, so two files would truncate each other mid-test — and
    // intermittently, which is the worst kind of failing test.
    fileParallelism: false,
  },
});
