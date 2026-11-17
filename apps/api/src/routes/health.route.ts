import { sql } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "@/db";

export const healthRoutes = new Elysia({ prefix: "/health" }).get("/", async () => {
  await db.execute(sql`SELECT 1`);
  return { status: "ok" };
});
