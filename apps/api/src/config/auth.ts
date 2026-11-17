import { wajib } from "./env";

const secret = wajib("BETTER_AUTH_SECRET");
if (secret.length < 32) throw new Error("BETTER_AUTH_SECRET minimal 32 karakter");

export const authConfig = {
  secret,
  url: wajib("BETTER_AUTH_URL"),
} as const;

