import { Conflict, Forbidden, NotFound, Unprocessable } from "@/lib/errors";
import { prisma, type Db } from "@/lib/prisma";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { DrafKegiatanRepository } from "@/repositories/draf-kegiatan.repository";
import { KegiatanRepository } from "@/repositories/kegiatan.repository";
import { ReferensiRepository } from "@/repositories/referensi.repository";
import type {
  BatalkanKegiatan,
  SelesaikanKegiatan,
  DaftarQuery,
  FilterDaftar,
  IsiKegiatan,
  LingkupBaca,
  NilaiKegiatan,
  PeriksaKegiatan,
  QueryFilter,
  UbahKegiatan,
} from "@/types/kegiatan.types";
import type { Aktor, GalatField, MetaRequest, Rentang } from "@/types/umum.types";
import { awalHariJakarta, parsePeriode, rentangPeriode } from "@/utils/periode";
import { hitungStatus } from "@/utils/status-kegiatan";
import { AuditLogService } from "./audit-log.service";
import { ReferensiService } from "./referensi.service";

type PemilikKegiatan = { bidangId: number; dibuatOleh: string; penanggungJawabId: number };

const AWAL_ZAMAN = new Date(Date.UTC(1000, 0, 1));
const AKHIR_ZAMAN = new Date(Date.UTC(9999, 11, 31));

// Merapikan teks opsional: dipangkas, dan teks kosong menjadi null
const teks = (nilai: string | null | undefined) => nilai?.trim() || null;

// ---------- Aturan hak akses kegiatan (dipakai juga oleh modul lain) ----------

// ADMIN boleh mengubah semua kegiatan; PEGAWAI hanya kegiatan yang dibuatnya atau yang dia tanggung jawabi
export function bisaUbah(aktor: Aktor, k: { dibuatOleh: string; penanggungJawabId: number }) {
  if (aktor.role === "ADMIN") return true;
  if (aktor.role !== "PEGAWAI") return false;
  return k.dibuatOleh === aktor.id || (aktor.pegawaiId != null && k.penanggungJawabId === aktor.pegawaiId);
}

// Lingkup baca PEGAWAI (bidangnya + turunannya, dan kegiatan miliknya); PIMPINAN/ADMIN melihat semua (undefined)
export async function lingkupBaca(aktor: Aktor): Promise<LingkupBaca | undefined> {
  if (aktor.role !== "PEGAWAI") return undefined;
  const p = aktor.pegawaiId == null ? undefined : await ReferensiRepository.findPegawaiAktif(aktor.pegawaiId);
  return {
    unitIds: p ? await ReferensiService.unitDanTurunan(p.bidangId) : [],
    milik: { userId: aktor.id, pegawaiId: aktor.pegawaiId },
  };
}

// Apakah kegiatan masuk lingkup baca; undefined (PIMPINAN/ADMIN) selalu boleh
export function dalamLingkup(lingkup: LingkupBaca | undefined, k: PemilikKegiatan) {
  if (!lingkup) return true;
  const { userId, pegawaiId } = lingkup.milik;
  return lingkup.unitIds.includes(k.bidangId) || k.dibuatOleh === userId || (pegawaiId != null && k.penanggungJawabId === pegawaiId);
}

// Memastikan aktor boleh menulis: di luar lingkup dianggap tidak ada (404), di dalam lingkup tapi bukan miliknya 403
export async function pastikanBisaTulis(aktor: Aktor, k: PemilikKegiatan, pesan: string, pesanTidakAda = "Kegiatan tidak ditemukan") {
  if (!dalamLingkup(await lingkupBaca(aktor), k)) throw NotFound(pesanTidakAda);
  if (!bisaUbah(aktor, k)) throw Forbidden(pesan);
}

// ---------- Filter dari query string ----------

// Rentang waktu dari query: dari/sampai (tanggal) lebih diutamakan daripada periode (bulan)
export function rentangDariQuery(query: Pick<QueryFilter, "periode" | "dari" | "sampai">): Rentang | undefined {
  if (query.dari || query.sampai) {
    if (query.dari && query.sampai && query.dari > query.sampai) {
      throw Unprocessable("Tanggal awal tidak boleh setelah tanggal akhir", [{ field: "sampai", message: "Tanggal akhir tidak boleh sebelum tanggal awal" }]);
    }
    return {
      mulai: query.dari ? awalHariJakarta(query.dari) : AWAL_ZAMAN,
      akhir: query.sampai ? awalHariJakarta(query.sampai, 1) : AKHIR_ZAMAN,
    };
  }
  return query.periode ? rentangPeriode(parsePeriode(query.periode)) : undefined;
}

// Mengubah query string menjadi FilterDaftar untuk repository (termasuk lingkup baca aktor)
export async function filterDariQuery(query: QueryFilter, aktor: Aktor): Promise<FilterDaftar> {
  return {
    lingkup: await lingkupBaca(aktor),
    unitIds: query.unit ? await ReferensiService.unitDanTurunan(query.unit) : undefined,
    jenisId: query.jenis,
    pegawaiId: query.pegawai,
    status: query.status,
    pemeriksaan: query.pemeriksaan,
    rentang: rentangDariQuery(query),
    q: query.q?.trim() || undefined,
  };
}

// ---------- Validasi isian ----------

// Memeriksa isian kegiatan dan mengubahnya menjadi nilai kolom; bidang diambil dari penanggung jawab
async function validasiIsi(isi: Omit<IsiKegiatan, "drafId">): Promise<NilaiKegiatan> {
  const galat: GalatField[] = [];
  const judul = isi.judul.trim();
  if (!judul) galat.push({ field: "judul", message: "Judul wajib diisi" });

  const mulai = new Date(isi.tglMulai);
  const selesai = new Date(isi.tglSelesai);
  if (selesai < mulai) galat.push({ field: "tglSelesai", message: "Tanggal selesai tidak boleh sebelum tanggal mulai" });

  const lat = isi.lat ?? null;
  const lng = isi.lng ?? null;
  if ((lat == null) !== (lng == null)) galat.push({ field: "lat", message: "Lintang dan bujur harus diisi berpasangan" });

  const [jenis, pj] = await Promise.all([
    ReferensiRepository.findJenisAktif(isi.jenisId),
    ReferensiRepository.findPegawaiAktif(isi.penanggungJawabId),
  ]);
  if (!jenis) galat.push({ field: "jenisId", message: "Jenis kegiatan tidak ditemukan atau nonaktif" });
  if (!pj) galat.push({ field: "penanggungJawabId", message: "Penanggung jawab tidak ditemukan atau nonaktif" });

  if (galat.length > 0 || !pj) throw Unprocessable("Periksa kembali isian kegiatan", galat);

  return {
    judul,
    jenisId: isi.jenisId,
    uraian: teks(isi.uraian),
    penanggungJawabId: pj.id,
    bidangId: pj.bidangId,
    jumlahPeserta: isi.jumlahPeserta ?? null,
    hasil: teks(isi.hasil),
    tglMulai: mulai,
    tglSelesai: selesai,
    lokasiNama: teks(isi.lokasiNama),
    lat: lat == null ? null : lat.toFixed(6),
    lng: lng == null ? null : lng.toFixed(6),
    refEksternal: teks(isi.refEksternal),
  };
}

// PEGAWAI hanya boleh mencatat kegiatan dengan dirinya sendiri sebagai penanggung jawab
function cekPenanggungJawab(aktor: Aktor, penanggungJawabId: number, lamaId?: number) {
  if (aktor.role !== "PEGAWAI") return;
  if (aktor.pegawaiId == null) throw Unprocessable("Akun Anda belum tertaut ke data pegawai. Hubungi administrator.");
  if (penanggungJawabId !== aktor.pegawaiId && penanggungJawabId !== lamaId) {
    throw Unprocessable("Periksa kembali isian kegiatan", [
      { field: "penanggungJawabId", message: "Pegawai hanya dapat mencatat kegiatan dengan dirinya sebagai penanggung jawab" },
    ]);
  }
}

// Mengunci kegiatan untuk diubah, memeriksa hak akses, dan (opsional) mencocokkan versinya
async function muatUntukTulis(id: number, aktor: Aktor, tx: Db, versi?: string) {
  const baris = await KegiatanRepository.kunciAktif(id, tx);
  if (!baris) throw NotFound("Kegiatan tidak ditemukan");
  await pastikanBisaTulis(aktor, baris, "Anda hanya dapat mengubah kegiatan milik Anda");
  if (versi && baris.updatedAt.getTime() !== new Date(versi).getTime()) throw Conflict();
  return baris;
}

export const KegiatanService = {
  // Daftar kegiatan dengan filter; setiap item diberi tanda `bisaUbah` untuk aktor
  async daftar(query: DaftarQuery, aktor: Aktor, sekarang = new Date()) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const filter: FilterDaftar = {
      ...(await filterDariQuery(query, aktor)),
      milik: query.milik === "saya" ? { userId: aktor.id, pegawaiId: aktor.pegawaiId } : undefined,
    };
    const { items, total } = await KegiatanRepository.daftar(filter, sekarang, { page, pageSize });
    return {
      items: items.map(({ dibuatOleh, ...k }) => ({ ...k, bisaUbah: bisaUbah(aktor, { dibuatOleh, penanggungJawabId: k.penanggungJawab.id }) })),
      total,
      page,
      pageSize,
    };
  },

  // Detail kegiatan lengkap: dokumentasi, riwayat, catatan pemeriksaan, dan hak aktor
  async detail(id: number, aktor: Aktor, sekarang = new Date()) {
    const k = await KegiatanRepository.detail(id, sekarang);
    const pemilik = k && { bidangId: k.bidang.id, dibuatOleh: k.pembuat.id, penanggungJawabId: k.penanggungJawab.id };
    if (!pemilik || !dalamLingkup(await lingkupBaca(aktor), pemilik)) throw NotFound("Kegiatan tidak ditemukan");

    const [dokumentasi, pengubahTerakhir, riwayat, catatanPemeriksaan] = await Promise.all([
      KegiatanRepository.daftarDokumentasi(id),
      AuditLogRepository.pengubahTerakhirKegiatan(id),
      AuditLogRepository.riwayatKegiatan(id),
      KegiatanRepository.daftarCatatan(id),
    ]);
    return {
      ...k,
      dokumentasi,
      pengubahTerakhir,
      riwayat,
      catatanPemeriksaan,
      bisaPeriksa: aktor.role === "PIMPINAN",
      bisaUbah: bisaUbah(aktor, pemilik),
    };
  },

  // Mencatat kegiatan baru; bila berasal dari draf, drafnya ikut dihapus
  async buat({ drafId, ...isi }: IsiKegiatan, aktor: Aktor, meta: MetaRequest) {
    cekPenanggungJawab(aktor, isi.penanggungJawabId);
    const nilai = { ...(await validasiIsi(isi)), dibuatOleh: aktor.id };
    return prisma.$transaction(async (tx) => {
      if (drafId && (await DrafKegiatanRepository.hapus(drafId, aktor.id, tx)) === 0) throw NotFound("Draf tidak ditemukan");
      const id = await KegiatanRepository.insert(nilai, tx);
      const baru = await KegiatanRepository.findById(id, tx);
      await AuditLogService.catat({ aktorId: aktor.id, aksi: "buat", entitas: "kegiatan", entitasId: id, sesudah: baru, ...meta }, tx);
      return { id, updatedAt: baru!.updatedAt };
    });
  },

  // Mengubah kegiatan; ditolak 409 bila versi (expectedUpdatedAt) sudah berbeda. Status pemeriksaan kembali "terkirim"
  async ubah(id: number, isi: UbahKegiatan, aktor: Aktor, meta: MetaRequest) {
    const { expectedUpdatedAt, ...data } = isi;
    const nilai = await validasiIsi(data);
    return prisma.$transaction(async (tx) => {
      const sebelum = await muatUntukTulis(id, aktor, tx, expectedUpdatedAt);
      cekPenanggungJawab(aktor, nilai.penanggungJawabId, sebelum.penanggungJawabId);
      const berubah = await KegiatanRepository.updateDenganVersi(id, sebelum.updatedAt, { ...nilai, statusPemeriksaan: "terkirim" }, tx);
      if (berubah === 0) throw Conflict();
      const sesudah = await KegiatanRepository.findById(id, tx);
      await AuditLogService.catat({ aktorId: aktor.id, aksi: "ubah", entitas: "kegiatan", entitasId: id, sebelum, sesudah, ...meta }, tx);
      return { id, updatedAt: sesudah!.updatedAt };
    });
  },

  // Menyelesaikan kegiatan yang sedang berlangsung: waktu selesai menjadi sekarang, sehingga statusnya langsung "selesai".
  // Status tetap dihitung dari waktu, jadi tidak ada status yang bisa tidak sinkron dengan waktunya
  async selesaikan(id: number, isi: SelesaikanKegiatan, aktor: Aktor, meta: MetaRequest) {
    return prisma.$transaction(async (tx) => {
      const sebelum = await muatUntukTulis(id, aktor, tx, isi.expectedUpdatedAt);
      const sekarang = new Date();
      const status = hitungStatus(sebelum, sekarang);
      if (status !== "berlangsung") {
        throw Unprocessable(
          status === "dibatalkan"
            ? "Kegiatan yang dibatalkan tidak dapat diselesaikan"
            : status === "akan_datang"
              ? "Kegiatan belum dimulai. Ubah waktunya lewat tombol Ubah"
              : "Kegiatan ini sudah selesai",
        );
      }
      const berubah = await KegiatanRepository.updateDenganVersi(id, sebelum.updatedAt, { tglSelesai: sekarang, statusPemeriksaan: "terkirim" }, tx);
      if (berubah === 0) throw Conflict();
      const sesudah = await KegiatanRepository.findById(id, tx);
      await AuditLogService.catat({ aktorId: aktor.id, aksi: "ubah", entitas: "kegiatan", entitasId: id, sebelum, sesudah, ...meta }, tx);
      return { id, updatedAt: sesudah!.updatedAt };
    });
  },

  // Pimpinan memeriksa kegiatan: tandai "diperiksa" atau "perlu_perbaikan" (wajib catatan)
  async periksa(id: number, isi: PeriksaKegiatan, aktor: Aktor, meta: MetaRequest) {
    const catatan = isi.catatan?.trim() || null;
    if (isi.status === "perlu_perbaikan" && !catatan) {
      throw Unprocessable("Tuliskan catatan perbaikan untuk pegawai", [{ field: "catatan", message: "Catatan perbaikan wajib diisi" }]);
    }
    return prisma.$transaction(async (tx) => {
      const sebelum = await KegiatanRepository.kunciAktif(id, tx);
      if (!sebelum) throw NotFound("Kegiatan tidak ditemukan");
      await KegiatanRepository.setPemeriksaan(id, isi.status, sebelum.updatedAt, tx);
      await KegiatanRepository.insertCatatan({ kegiatanId: id, pemeriksaId: aktor.id, status: isi.status, isi: catatan }, tx);
      await AuditLogService.catat(
        {
          aktorId: aktor.id,
          aksi: "periksa",
          entitas: "kegiatan",
          entitasId: id,
          sebelum: { statusPemeriksaan: sebelum.statusPemeriksaan },
          sesudah: { statusPemeriksaan: isi.status, catatan },
          ...meta,
        },
        tx,
      );
      return { id, statusPemeriksaan: isi.status };
    });
  },

  // Membatalkan kegiatan dengan alasan (kegiatan tetap tersimpan, statusnya "dibatalkan")
  async batalkan(id: number, isi: BatalkanKegiatan, aktor: Aktor, meta: MetaRequest) {
    const alasan = isi.alasan.trim();
    if (!alasan) throw Unprocessable("Alasan pembatalan wajib diisi", [{ field: "alasan", message: "Alasan pembatalan wajib diisi" }]);
    return prisma.$transaction(async (tx) => {
      const sebelum = await muatUntukTulis(id, aktor, tx, isi.expectedUpdatedAt);
      if (sebelum.dibatalkanAt) throw Unprocessable("Kegiatan ini sudah dibatalkan");
      if (hitungStatus(sebelum, new Date()) === "selesai") throw Unprocessable("Kegiatan yang sudah selesai tidak dapat dibatalkan");
      const berubah = await KegiatanRepository.updateDenganVersi(id, sebelum.updatedAt, { dibatalkanAt: new Date(), alasanBatal: alasan }, tx);
      if (berubah === 0) throw Conflict();
      const sesudah = await KegiatanRepository.findById(id, tx);
      await AuditLogService.catat({ aktorId: aktor.id, aksi: "batal", entitas: "kegiatan", entitasId: id, sebelum, sesudah, ...meta }, tx);
      return { id, updatedAt: sesudah!.updatedAt };
    });
  },

  // Menghapus kegiatan secara lunak (tidak muncul lagi di daftar/rekap)
  async hapus(id: number, aktor: Aktor, meta: MetaRequest) {
    await prisma.$transaction(async (tx) => {
      const sebelum = await muatUntukTulis(id, aktor, tx);
      await KegiatanRepository.softDelete(id, tx);
      await AuditLogService.catat({ aktorId: aktor.id, aksi: "hapus", entitas: "kegiatan", entitasId: id, sebelum, ...meta }, tx);
    });
  },
};
