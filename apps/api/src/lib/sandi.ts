import { verifyPassword as cocokScrypt } from "better-auth/crypto";

export const hashSandi = (sandi: string) => Bun.password.hash(sandi, { algorithm: "argon2id" });

export async function cocokSandi({ hash, password }: { hash: string; password: string }) {
  if (hash.startsWith("$argon2")) return Bun.password.verify(password, hash);
  return cocokScrypt({ hash, password });
}

export const perluHashUlang = (hash: string) => !hash.startsWith("$argon2id$");
