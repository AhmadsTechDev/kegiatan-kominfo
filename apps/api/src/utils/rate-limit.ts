import { TooManyRequests } from "@/lib/errors";

// Membuat pembatas laju di memori: maksimal `maks` permintaan per `jendelaMs` untuk tiap kunci (IP/akun)
export function buatPembatasLaju({ jendelaMs, maks, pesan }: { jendelaMs: number; maks: number; pesan?: string }) {
  const catatan = new Map<string, number[]>();

  // Mencatat satu permintaan; melempar galat 429 bila kuota kunci ini sudah habis
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
