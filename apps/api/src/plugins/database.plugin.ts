import { Elysia } from "elysia";
import { pool } from "@/db";

export const databasePlugin = new Elysia({ name: "database" })
  .onStart(async () => {
    (await pool.connect()).release();
  })
  .onStop(async () => {
    await pool.end();
  });
