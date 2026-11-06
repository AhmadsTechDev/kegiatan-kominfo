import sharp from "sharp";
import { PayloadTooLarge, UnsupportedMediaType } from "@/lib/errors";

export const UKURAN_MAKS_DOKUMENTASI = 20 * 1024 * 1024;
export const JUMLAH_MAKS_DOKUMENTASI = 10;
export const UKURAN_MAKS_FOTO = 2 * 1024 * 1024;
const SISI_MAKS_DOKUMENTASI = 1920;
const SISI_FOTO_PROFIL = 320;

type Jenis = { mime: string; ext: string; foto: boolean };

const JENIS = {
  jpeg: { mime: "image/jpeg", ext: "jpg", foto: true },
  png: { mime: "image/png", ext: "png", foto: true },
  webp: { mime: "image/webp", ext: "webp", foto: true },
  pdf: { mime: "application/pdf", ext: "pdf", foto: false },
} satisfies Record<string, Jenis>;

/**
 * Mengecek apakah byte di posisi tertentu sama dengan tanda yang dicari
 */
const cocok = (b: Uint8Array, posisi: number, tanda: number[]) => tanda.every((x, i) => b[posisi + i] === x);

/**
 * Mengubah teks menjadi deretan kode ASCII
 */
const ascii = (teks: string) => [...teks].map((c) => c.charCodeAt(0));

/**
 * Mengenali jenis berkas dari isi byte awalnya (magic bytes), bukan dari nama berkas
 */
export function kenaliJenis(b: Uint8Array): Jenis | null {
  if (cocok(b, 0, [0xff, 0xd8, 0xff])) return JENIS.jpeg;
  if (cocok(b, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return JENIS.png;
  if (cocok(b, 0, ascii("RIFF")) && cocok(b, 8, ascii("WEBP"))) return JENIS.webp;
  if (cocok(b, 0, ascii("%PDF-"))) return JENIS.pdf;
  return null;
}

/**
 * Membersihkan nama berkas asli dari path dan karakter kontrol
 */
export function bersihkanNama(nama: string) {
  const dasar = nama.split(/[\\/]/).pop() ?? "";
  const bersih = dasar.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (bersih || "berkas").slice(0, 255);
}

/**
 * Memeriksa dan menyiapkan berkas dokumentasi: cek ukuran & jenis, kompres foto, hitung SHA-256
 */
export async function prosesBerkas(berkas: File) {
  if (berkas.size > UKURAN_MAKS_DOKUMENTASI) throw PayloadTooLarge("Ukuran maksimal 20 MB");
  const asli = new Uint8Array(await berkas.arrayBuffer());
  const jenis = kenaliJenis(asli);
  if (!jenis) throw UnsupportedMediaType();

  let bytes = asli;
  if (jenis.foto) {
    try {
      const gambar = sharp(asli, { failOn: "error" })
        .rotate()
        .resize({ width: SISI_MAKS_DOKUMENTASI, height: SISI_MAKS_DOKUMENTASI, fit: "inside", withoutEnlargement: true });
      const hasil =
        jenis === JENIS.jpeg
          ? gambar.jpeg({ quality: 85, mozjpeg: true })
          : jenis === JENIS.png
            ? gambar.png({ compressionLevel: 9 })
            : gambar.webp({ quality: 85 });
      bytes = new Uint8Array(await hasil.toBuffer());
    } catch {
      throw UnsupportedMediaType("Berkas gambar rusak atau tidak dikenali");
    }
  }

  const sha256 = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
  return { bytes, mime: jenis.mime, ext: jenis.ext, sha256, namaAsli: bersihkanNama(berkas.name) };
}

/**
 * Menyiapkan foto profil: cek jenis, potong persegi 320x320, ubah ke WebP (EXIF/GPS ikut terbuang)
 */
export async function prosesFotoProfil(berkas: File) {
  if (berkas.size > UKURAN_MAKS_FOTO) throw PayloadTooLarge("Ukuran foto maksimal 2 MB");
  const asli = new Uint8Array(await berkas.arrayBuffer());
  const jenis = kenaliJenis(asli);
  if (!jenis?.foto) throw UnsupportedMediaType("Foto harus JPEG, PNG, atau WebP");
  try {
    const hasil = await sharp(asli, { failOn: "error" })
      .rotate()
      .resize({ width: SISI_FOTO_PROFIL, height: SISI_FOTO_PROFIL, fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
    return new Uint8Array(hasil);
  } catch {
    throw UnsupportedMediaType("Berkas gambar rusak atau tidak dikenali");
  }
}

/**
 * Menyusun header Content-Disposition yang aman untuk nama berkas berhuruf non-ASCII
 */
export function disposisi(jenis: "inline" | "attachment", nama: string) {
  const asciiNama = nama.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${jenis}; filename="${asciiNama}"; filename*=UTF-8''${encodeURIComponent(nama)}`;
}
