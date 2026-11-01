const BULAN_PPPK = 21;
const USIA_MIN_PENGANGKATAN = 17;

// Memeriksa struktur 18 digit NIP ASN; mengembalikan pesan galat, atau null bila sah
export function periksaNip(nip: string, sekarang = new Date()): string | null {
  if (!/^\d{18}$/.test(nip)) return "NIP harus 18 digit angka";

  const thnLahir = Number(nip.slice(0, 4));
  const blnLahir = Number(nip.slice(4, 6));
  const tglLahir = Number(nip.slice(6, 8));
  const lahir = new Date(Date.UTC(thnLahir, blnLahir - 1, tglLahir));
  const tanggalAda = lahir.getUTCFullYear() === thnLahir && lahir.getUTCMonth() === blnLahir - 1 && lahir.getUTCDate() === tglLahir;
  if (!tanggalAda || thnLahir < 1940 || lahir > sekarang) return "8 digit pertama NIP harus tanggal lahir yang valid (TTTTBBHH)";

  const thnTmt = Number(nip.slice(8, 12));
  const blnTmt = Number(nip.slice(12, 14));
  if (!((blnTmt >= 1 && blnTmt <= 12) || blnTmt === BULAN_PPPK)) return "Digit 13-14 NIP harus bulan pengangkatan (01-12, atau 21 untuk PPPK)";
  if (thnTmt < thnLahir + USIA_MIN_PENGANGKATAN || thnTmt > sekarang.getFullYear() + 1) return "Tahun pengangkatan pada NIP (digit 9-12) tidak sesuai dengan tanggal lahir";

  if (nip[14] !== "1" && nip[14] !== "2") return "Digit ke-15 NIP harus 1 (laki-laki) atau 2 (perempuan)";
  if (nip.slice(15) === "000") return "Nomor urut NIP (3 digit terakhir) tidak boleh 000";
  return null;
}
