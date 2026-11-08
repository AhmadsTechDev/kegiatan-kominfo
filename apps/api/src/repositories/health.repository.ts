import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const HealthRepository = {
  /**
   * Kueri paling ringan untuk memastikan basis data bisa dihubungi
   */
  async ping() {
    await db.execute(sql`SELECT 1`);
  },
};
