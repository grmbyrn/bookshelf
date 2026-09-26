import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "./AppError.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if(err instanceof AppError){
        return res.status(err.statusCode).json({error: {code: err.code, message: err.message}})
    }

    if(err instanceof ZodError){
        return res.status(400).json({error: {code: "VALIDATION_ERROR", message: "Invalid request"}})
    }

    console.error(err)
    res.status(500).json({error: {code: "INTERNAL", message: "Something went wrong"}})
}