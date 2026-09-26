import { defineConfig } from "vitest/config"
import dotenv from "dotenv"

const { parsed } = dotenv.config({ path: ".env.test" })

export default defineConfig({
  test: { env: parsed },
})
