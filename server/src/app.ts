import express from "express"
import cors from "cors"
import helmet from "helmet"
import cookieParser from "cookie-parser"
import { env } from "./config/env.js"
import { healthRouter } from "./routes/health.js"

export const app = express()
app.use(helmet())
app.use(cors({origin: env.CLIENT_URL, credentials: true}))
app.use(express.json())
app.use(cookieParser())

app.use("/api", healthRouter)