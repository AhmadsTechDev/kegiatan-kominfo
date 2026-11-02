// =============================================================================
// UTILITAS PEMFORMAT DATA TAMPILAN
// =============================================================================
// Gunanya: Menyeragamkan format tanggal, jam, rentang waktu, angka numerik,
// periode, ukuran berkas unduhan, dan inisial pengguna sesuai standar lokal id-ID.
//
// Isi berkas:
//   - formatTanggal        : memformat tanggal ke gaya bahasa Indonesia ("16 Okt 2026").
//   - formatJam            : memformat jam ke format 24 jam dengan akhiran "WIB".
//   - formatRentangTanggal : meringkas rentang dua tanggal pada bulan yang sama.
//   - formatAngka          : memformat angka dengan tanda pemisah ribuan titik.
//   - formatPeriode        : mengubah format "YYYY-MM" menjadi nama bulan dan tahun.
//   - periodeSebelumnya    : menghasilkan daftar kode periode mundur beberapa bulan.
//   - formatUkuran         : mengubah besaran bita menjadi teks KB atau MB ramah baca.
//   - formatTanggalJam     : menggabungkan tanggal dan jam dalam satu baris teks.
//   - inisial              : mengambil inisial 1-2 huruf kapital dari nama pengguna.
//   - formatHari           : memformat tanggal dengan nama hari (panjang atau pendek).
//   - tanggalWib           : mengambil tanggal kalender ISO "YYYY-MM-DD" waktu WIB.
//
// Catatan penting:
//   - Menjadi acuan tunggal seluruh tampilan antarmuka (DESIGN.md bagian 11).
//   - Zona waktu dikunci ke Asia/Jakarta agar hasil di server dan peramban identik.
//
// Dipakai oleh: Seluruh tabel, formulir, dashboard, dan kartu ringkasan kegiatan.
// =============================================================================

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

export function tanggalWib(nilai: string | Date): string {
  return new Date(new Date(nilai).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Nomor telepon dalam satu bentuk: awalan 62 atau +62 menjadi 0, lalu dikelompokkan 4-4-sisanya (0812-3456-7890)
export function formatTelp(nilai: string): string {
  let angka = nilai.replace(/\D/g, "");
  if (angka.startsWith("62")) angka = `0${angka.slice(2)}`;
  return [angka.slice(0, 4), angka.slice(4, 8), angka.slice(8)].filter(Boolean).join("-");
}
