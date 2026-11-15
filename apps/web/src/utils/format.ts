/**
 * Format tanggal, jam, angka, periode, ukuran berkas, dan inisial (id-ID)
 */

/**
 * KONSEP Intl: API bawaan JavaScript untuk memformat tanggal dan angka sesuai bahasa/wilayah.
 * "id-ID" menghasilkan format Indonesia (mis. "5 Nov 2026", "1.234"), dan timeZone memastikan jam selalu WIB
 * walaupun perangkat pengguna diatur ke zona waktu lain.
 */
const ZONA = "Asia/Jakarta";

export function formatTanggal(nilai: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: ZONA,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(nilai));
}

export function formatJam(nilai: string | Date): string {
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: ZONA,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(nilai))
    .replace(".", ":")} WIB`;
}

/**
 * Meringkas rentang tanggal agar tidak berulang: "3–4 Nov 2026" bila bulan dan tahunnya sama,
 * selain itu "30 Okt 2026 – 2 Nov 2026".
 * @returns teks rentang tanggal dalam WIB
 */
export function formatRentangTanggal(mulai: string | Date, selesai: string | Date): string {
  const a = formatTanggal(mulai);
  const b = formatTanggal(selesai);
  if (a === b) return a;
  const [hariA, ...sisaA] = a.split(" ");
  const [hariB, ...sisaB] = b.split(" ");
  if (sisaA.join(" ") === sisaB.join(" ")) return `${hariA}–${hariB} ${sisaB.join(" ")}`;
  return `${a} – ${b}`;
}

export function formatAngka(nilai: number): string {
  return new Intl.NumberFormat("id-ID").format(nilai);
}

/**
 * Tanggal 15 pukul 12.00 UTC dipakai sebagai titik tengah bulan, jadi pergeseran zona waktu tidak membuat bulannya mundur atau maju.
 */
export function formatPeriode(kode: string, panjang = false): string {
  const [tahun, bulan] = kode.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: ZONA,
    month: panjang ? "long" : "short",
    year: "numeric",
  }).format(new Date(Date.UTC(tahun!, bulan! - 1, 15, 12)));
}

export function periodeSebelumnya(kode: string, jumlah: number): string[] {
  const [tahun, bulan] = kode.split("-").map(Number);
  return Array.from({ length: jumlah }, (_, i) => {
    const indeks = tahun! * 12 + (bulan! - 1) - i;
    return `${Math.floor(indeks / 12)}-${String((indeks % 12) + 1).padStart(2, "0")}`;
  });
}

export function formatUkuran(byte: number): string {
  if (byte < 1024 * 1024) return `${formatAngka(Math.max(1, Math.round(byte / 1024)))} KB`;
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(byte / (1024 * 1024))} MB`;
}

export function formatTanggalJam(nilai: string | Date): string {
  return `${formatTanggal(nilai)}, ${formatJam(nilai)}`;
}

/**
 * Contoh: "Budi Setiawan" -> "BS". Dipakai sebagai pengganti foto profil.
 */
export function inisial(nama: string): string {
  return nama
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((kata) => kata[0]!.toUpperCase())
    .join("");
}

export function formatHari(tanggal: string, pendek = false): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: ZONA,
    weekday: pendek ? "short" : "long",
    day: "numeric",
    month: pendek ? "short" : "long",
    ...(pendek ? {} : { year: "numeric" }),
  }).format(new Date(`${tanggal}T12:00:00+07:00`));
}

/**
 * Tanggal "YYYY-MM-DD" menurut WIB: waktu digeser +7 jam lalu diambil 10 karakter pertama dari format ISO.
 */
export function tanggalWib(nilai: string | Date): string {
  return new Date(new Date(nilai).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Nomor telepon dalam satu bentuk: awalan 62 atau +62 menjadi 0, lalu dikelompokkan 4-4-sisanya (0812-3456-7890)
 */
export function formatTelp(nilai: string): string {
  let angka = nilai.replace(/\D/g, "");
  if (angka.startsWith("62")) angka = `0${angka.slice(2)}`;
  return [angka.slice(0, 4), angka.slice(4, 8), angka.slice(8)].filter(Boolean).join("-");
}
