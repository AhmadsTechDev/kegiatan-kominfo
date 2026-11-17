import type { IsiEmail } from "@/lib/mailer";

export type Surel = { kepada: string; subjek: string; isi: IsiEmail };

export const kotakSurat: Surel[] = [];

export async function kirimEmailPalsu(kepada: string, subjek: string, isi: IsiEmail) {
  kotakSurat.push({ kepada, subjek, isi });
}

export function suratTerakhir(kepada: string) {
  return kotakSurat.findLast((s) => s.kepada.split(",").includes(kepada));
}

export function tokenDari(surel: Surel) {
  return new URL(surel.isi.tombol!.url).searchParams.get("token")!;
}
