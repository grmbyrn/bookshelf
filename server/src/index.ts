import "dotenv/config"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import cookieParser from "cookie-parser"
import { sql } from "drizzle-orm"
import {db} from "./db/index.js"

const app = express()
app.use(helmet())
app.use(cors({origin: process.env.CLIENT_URL, credentials: true}))
app.use(express.json())
app.use(cookieParser())

app.get("/api/health", async (_req, res) => {
    try {
        await db.execute(sql`select 1`)
        res.json({status: "ok", database: "connected"})
    } catch {
        res.status(500).json({status: "error", database: "disconnected"})
    }
})

app.listen(Number(process.env.PORT) || 3001, () => 
    console.log(`server on http://localhost:${process.env.PORT ?? 3001}`)
)