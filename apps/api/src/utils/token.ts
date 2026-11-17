export const TUJUAN_TOKEN = ["aktivasi", "reset-sandi", "ganti-email"] as const;
export type TujuanToken = (typeof TUJUAN_TOKEN)[number];

export const MASA_TOKEN_MS: Record<TujuanToken, number> = {
  aktivasi: 72 * 60 * 60 * 1000,
  "reset-sandi": 60 * 60 * 1000,
  "ganti-email": 24 * 60 * 60 * 1000,
};

export function buatToken() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
}

export function hashToken(token: string) {
  return new Bun.CryptoHasher("sha256").update(token).digest("hex");
}

export const identifierToken = (tujuan: TujuanToken, token: string) => `${tujuan}:${hashToken(token)}`;
