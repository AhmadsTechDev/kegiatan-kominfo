import { Elysia } from "elysia";
import { HealthController } from "@/controllers/health.controller";

/**
 * Cek kesehatan server dan basis data (dipakai Docker healthcheck), tanpa login
 */
export const healthRoutes = new Elysia({ prefix: "/health" }).get("/", HealthController.cek);
