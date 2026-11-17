import { wajib } from "./env";

export const databaseConfig = {
  url: wajib("DATABASE_URL"),
  poolMax: Number(process.env.DATABASE_POOL_MAX || 10),
} as const;

