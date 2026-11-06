/**
 * Pembuat berkas ZIP sederhana tanpa kompresi (metode "store"), dialirkan berkas demi berkas.
 * Foto JPEG/WebP dan PDF sudah terkompresi, jadi kompresi ulang hampir tidak mengecilkan ukuran
 * dan hanya membebani server. Format mengikuti PKWARE APPNOTE (ZIP32: total di bawah 4 GB).
 */

export type EntriZip = { nama: string; waktu: Date; baca: () => Promise<Uint8Array | null> };

const TANDA_LOKAL = 0x04034b50;
const TANDA_PUSAT = 0x02014b50;
const TANDA_AKHIR = 0x06054b50;

/**
 * Bit 11: nama berkas memakai UTF-8, agar nama berhuruf non-ASCII tetap terbaca
 */
const BENDERA_UTF8 = 0x0800;
const VERSI = 20;

/**
 * Tanggal dan jam format DOS, dalam WIB agar sama dengan waktu di aplikasi
 */
function waktuDos(d: Date) {
  const w = new Date(d.getTime() + 7 * 3600_000);
  const tahun = Math.max(1980, w.getUTCFullYear());
  return {
    jam: (w.getUTCHours() << 11) | (w.getUTCMinutes() << 5) | Math.floor(w.getUTCSeconds() / 2),
    tanggal: ((tahun - 1980) << 9) | ((w.getUTCMonth() + 1) << 5) | w.getUTCDate(),
  };
}

function kepalaLokal(nama: Uint8Array, crc: number, ukuran: number, jam: number, tanggal: number) {
  const b = new DataView(new ArrayBuffer(30));
  b.setUint32(0, TANDA_LOKAL, true);
  b.setUint16(4, VERSI, true);
  b.setUint16(6, BENDERA_UTF8, true);
  b.setUint16(8, 0, true);
  b.setUint16(10, jam, true);
  b.setUint16(12, tanggal, true);
  b.setUint32(14, crc, true);
  b.setUint32(18, ukuran, true);
  b.setUint32(22, ukuran, true);
  b.setUint16(26, nama.length, true);
  b.setUint16(28, 0, true);
  return gabung([new Uint8Array(b.buffer), nama]);
}

function kepalaPusat(nama: Uint8Array, crc: number, ukuran: number, jam: number, tanggal: number, offset: number) {
  const b = new DataView(new ArrayBuffer(46));
  b.setUint32(0, TANDA_PUSAT, true);
  b.setUint16(4, VERSI, true);
  b.setUint16(6, VERSI, true);
  b.setUint16(8, BENDERA_UTF8, true);
  b.setUint16(10, 0, true);
  b.setUint16(12, jam, true);
  b.setUint16(14, tanggal, true);
  b.setUint32(16, crc, true);
  b.setUint32(20, ukuran, true);
  b.setUint32(24, ukuran, true);
  b.setUint16(28, nama.length, true);
  b.setUint32(42, offset, true);
  return gabung([new Uint8Array(b.buffer), nama]);
}

function penutup(jumlah: number, ukuranPusat: number, offsetPusat: number) {
  const b = new DataView(new ArrayBuffer(22));
  b.setUint32(0, TANDA_AKHIR, true);
  b.setUint16(8, jumlah, true);
  b.setUint16(10, jumlah, true);
  b.setUint32(12, ukuranPusat, true);
  b.setUint32(16, offsetPusat, true);
  return new Uint8Array(b.buffer);
}

function gabung(bagian: Uint8Array[]) {
  const hasil = new Uint8Array(bagian.reduce((n, b) => n + b.length, 0));
  let i = 0;
  for (const b of bagian) {
    hasil.set(b, i);
    i += b.length;
  }
  return hasil;
}

/**
 * Berkas yang tidak ditemukan di penyimpanan (baca() mengembalikan null) dilewati
 */
export function aliranZip(entri: EntriZip[]): ReadableStream<Uint8Array> {
  const enkoder = new TextEncoder();
  const pusat: Uint8Array[] = [];
  let offset = 0;
  let i = 0;

  return new ReadableStream<Uint8Array>({
    async pull(kontrol) {
      while (i < entri.length) {
        const e = entri[i++]!;
        const isi = await e.baca();
        if (!isi) continue;
        const nama = enkoder.encode(e.nama);
        const crc = Bun.hash.crc32(isi) >>> 0;
        const { jam, tanggal } = waktuDos(e.waktu);
        const kepala = kepalaLokal(nama, crc, isi.length, jam, tanggal);
        pusat.push(kepalaPusat(nama, crc, isi.length, jam, tanggal, offset));
        offset += kepala.length + isi.length;
        kontrol.enqueue(kepala);
        kontrol.enqueue(isi);
        return;
      }
      const isiPusat = gabung(pusat);
      kontrol.enqueue(isiPusat);
      kontrol.enqueue(penutup(pusat.length, isiPusat.length, offset));
      kontrol.close();
    },
  });
}
