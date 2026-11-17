import { TooManyRequests } from "@/lib/errors";

export function buatPembatasLaju({ jendelaMs, maks, pesan }: { jendelaMs: number; maks: number; pesan?: string }) {
  const catatan = new Map<string, number[]>();

  return function periksa(kunci: string, sekarang = Date.now()) {
    const batasBawah = sekarang - jendelaMs;
    const waktu = (catatan.get(kunci) ?? []).filter((w) => w > batasBawah);
    if (waktu.length >= maks) {
      catatan.set(kunci, waktu);
      throw TooManyRequests(pesan);
    }
    waktu.push(sekarang);
    catatan.set(kunci, waktu);
  };
}
