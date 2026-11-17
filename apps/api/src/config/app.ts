import { wajib } from "./env";

export const appConfig = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 3001),
  FRONTEND_URL: wajib("FRONTEND_URL"),
  PENGINGAT_AKTIF: process.env.PENGINGAT_AKTIF !== "false",
} as const;

export const isProduction = appConfig.NODE_ENV === "production";

