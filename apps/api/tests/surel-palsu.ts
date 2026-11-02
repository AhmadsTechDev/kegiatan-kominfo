import type { IsiEmail } from "@/lib/mailer";

export type Surel = { kepada: string; subjek: string; isi: IsiEmail };

// Semua email yang "terkirim" selama pengujian (email sungguhan tidak pernah dikirim)
export const kotakSurat: Surel[] = [];

// Pengganti kirimEmail: menyimpan email ke kotakSurat
export async function kirimEmailPalsu(kepada: string, subjek: string, isi: IsiEmail) {
  kotakSurat.push({ kepada, subjek, isi });
}

// Email terakhir yang dikirim ke alamat tertentu
export function suratTerakhir(kepada: string) {
  return kotakSurat.findLast((s) => s.kepada.split(",").includes(kepada));
}

// Mengambil token aktivasi dari tombol di email undangan
export function tokenDari(surel: Surel) {
  return new URL(surel.isi.tombol!.url).searchParams.get("token")!;
}
