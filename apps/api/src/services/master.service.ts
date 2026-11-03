import { NotFound, Unprocessable } from "@/lib/errors";
import { galatDuplikat, prisma } from "@/lib/prisma";
import { MasterRepository } from "@/repositories/master.repository";
import type {
  DaftarPegawaiQuery,
  IsiJenis,
  IsiPegawai,
  IsiUnit,
  NilaiPegawai,
} from "@/types/master.types";
import type { AksiAudit, Aktor, GalatField, MetaRequest } from "@/types/umum.types";
import { periksaNip } from "@/utils/nip";
import { AuditLogService } from "./audit-log.service";
import { ReferensiService } from "./referensi.service";

const AWALAN_BAWAAN: Record<string, string> = { bidang: "BID", "sub bidang": "SUBBID" };
const KATA_SAMBUNG = new Set(["dan", "serta", "atau", "di", "ke", "dari", "yang", "untuk", "pada"]);

// Merapikan teks opsional: dipangkas, teks kosong menjadi null
const teks = (nilai: string | null | undefined) => nilai?.trim() || null;

// Memecah teks menjadi kata (huruf/angka saja)
const kataKata = (s: string) => s.split(/[^A-Za-z0-9]+/).filter(Boolean);

// Menjalankan `kerja`; bila gagal karena data UNIQUE kembar, ubah menjadi galat 422 yang ramah
async function denganCekDuplikat<T>(field: string, pesan: string, kerja: () => Promise<T>) {
  try {
    return await kerja();
  } catch (e) {
    if (galatDuplikat(e)) throw Unprocessable(pesan, [{ field, message: pesan }]);
    throw e;
  }
}

// Menentukan aksi audit saat mengubah data master: ubah, aktifkan, atau nonaktifkan
function aksiUbah(sebelum: { aktif: boolean }, aktifBaru: boolean | undefined): AksiAudit {
  if (aktifBaru === undefined || aktifBaru === sebelum.aktif) return "ubah";
  return aktifBaru ? "aktifkan" : "nonaktifkan";
}

// Membuat kode otomatis dari tingkat dan singkatan nama, contoh "BID-TIP"; ditambah "-2", "-3" bila sudah dipakai
async function buatKodeUnit(nama: string, namaJenis: string) {
  const kataJenis = kataKata(namaJenis);
  const awalan = AWALAN_BAWAAN[namaJenis.toLowerCase()] ?? kataJenis.join("").toUpperCase().slice(0, 12);
  const kataNama = kataKata(nama);
  const diawaliJenis = kataNama.slice(0, kataJenis.length).join(" ").toLowerCase() === kataJenis.join(" ").toLowerCase();
  const singkatan = (diawaliJenis ? kataNama.slice(kataJenis.length) : kataNama)
    .filter((k) => !KATA_SAMBUNG.has(k.toLowerCase()))
    .map((k) => k[0]!.toUpperCase())
    .join("")
    .slice(0, 8);
  const dasar = (singkatan ? `${awalan}-${singkatan}` : awalan) || "UNIT";
  const terpakai = await MasterRepository.kodeUnitBerawalan(dasar);
  if (!terpakai.has(dasar)) return dasar;
  for (let i = 2; ; i++) if (!terpakai.has(`${dasar}-${i}`)) return `${dasar}-${i}`;
}

// Memeriksa isian bidang. Tanpa induk berarti bidang; dengan induk berarti sub bidang, dan induknya harus sebuah bidang (maksimal dua tingkat)
async function validasiUnit(isi: Omit<IsiUnit, "aktif">, sebelum?: { id: number; parentId: number | null }) {
  const galat: GalatField[] = [];
  if (!isi.nama.trim()) galat.push({ field: "nama", message: "Nama wajib diisi" });
  if (isi.parentId != null) {
    const induk = await MasterRepository.unitById(isi.parentId);
    if (!induk || induk.id === sebelum?.id) galat.push({ field: "parentId", message: "Bidang induk wajib dipilih" });
    else if (induk.parentId !== null) galat.push({ field: "parentId", message: "Induk sub bidang harus bidang" });
    else if (!induk.aktif && induk.id !== sebelum?.parentId) galat.push({ field: "parentId", message: "Bidang induk sedang nonaktif" });
    else if (sebelum && sebelum.parentId === null && (await MasterRepository.jumlahTurunan(sebelum.id)) > 0) {
      galat.push({ field: "parentId", message: "Bidang yang masih punya sub bidang tidak dapat dijadikan sub bidang" });
    }
  }
  if (galat.length) throw Unprocessable("Periksa kembali isian bidang", galat);
  return {
    nilai: { kode: isi.kode?.trim().toUpperCase() || null, nama: isi.nama.trim(), parentId: isi.parentId },
    namaJenis: isi.parentId == null ? "Bidang" : "Sub bidang",
  };
}

// Memeriksa isian pegawai: NIP sah dan belum dipakai, email belum dipakai, bidang ada dan aktif.
// Juga dipakai user.service.ts saat admin membuat/mengubah akun beserta data pegawainya
export async function validasiPegawai(
  isi: IsiPegawai,
  unitLamaId?: number,
  nipLama?: string | null,
  opsi: { pegawaiId?: number; email?: string | null } = {},
): Promise<NilaiPegawai> {
  const galat: GalatField[] = [];
  const nip = isi.nip?.trim() || null;
  const salahNip = nip && nip !== nipLama ? periksaNip(nip) : null;
  if (salahNip) galat.push({ field: "nip", message: salahNip });
  if (nip && !salahNip && nip !== nipLama) {
    const pemilik = await MasterRepository.pegawaiDenganNip(nip);
    if (pemilik && pemilik.id !== opsi.pegawaiId) galat.push({ field: "nip", message: `NIP sudah terdaftar atas nama ${pemilik.nama}` });
  }
  if (opsi.email && (await MasterRepository.akunDenganEmail(opsi.email))) galat.push({ field: "email", message: "Email sudah dipakai akun lain" });
  if (!isi.nama.trim()) galat.push({ field: "nama", message: "Nama wajib diisi" });
  const unit = await MasterRepository.unitById(isi.bidangId);
  if (!unit) galat.push({ field: "bidangId", message: "Bidang tidak ditemukan" });
  else if (!unit.aktif && unit.id !== unitLamaId) galat.push({ field: "bidangId", message: "Bidang sedang nonaktif" });
  if (galat.length) throw Unprocessable("Periksa kembali isian pegawai", galat);
  return { nip, nama: isi.nama.trim(), jabatan: teks(isi.jabatan), bidangId: isi.bidangId };
}

// Nama jenis kegiatan wajib diisi
function validasiNamaJenis(nama: string) {
  const bersih = nama.trim();
  if (!bersih) throw Unprocessable("Nama jenis wajib diisi", [{ field: "nama", message: "Nama jenis wajib diisi" }]);
  return bersih;
}

export const MasterService = {
  // ---------- Bidang ----------

  // Semua bidang beserta jumlah pegawai aktifnya
  async daftarUnit() {
    const [unit, jumlah] = await Promise.all([MasterRepository.daftarUnit(), MasterRepository.jumlahPegawaiPerUnit()]);
    const peta = new Map(jumlah.map((j) => [j.bidangId, j.jumlah]));
    return unit.map((u) => ({ ...u, jumlahPegawaiAktif: peta.get(u.id) ?? 0 }));
  },

  // Membuat bidang; kode dibuat otomatis bila dikosongkan
  async buatUnit(isi: IsiUnit, aktor: Aktor, meta: MetaRequest) {
    const { nilai: isian, namaJenis } = await validasiUnit(isi);
    const nilai = { ...isian, kode: isian.kode ?? (await buatKodeUnit(isian.nama, namaJenis)) };
    return denganCekDuplikat("kode", "Kode unit sudah dipakai", () =>
      prisma.$transaction(async (tx) => {
        const id = await MasterRepository.insertUnit(nilai, tx);
        const sesudah = await MasterRepository.unitById(id, tx);
        await AuditLogService.catat({ aktorId: aktor.id, aksi: "buat", entitas: "bidang", entitasId: id, sesudah, ...meta }, tx);
        return { id };
      }),
    );
  },

  // Mengubah atau (non)aktifkan bidang; ditolak bila masih punya turunan/pegawai aktif
  async ubahUnit(id: number, isi: IsiUnit, aktor: Aktor, meta: MetaRequest) {
    const sebelum = await MasterRepository.unitById(id);
    if (!sebelum) throw NotFound("Bidang tidak ditemukan");
    const { nilai: isian } = await validasiUnit(isi, sebelum);
    const nilai = { ...isian, kode: isian.kode ?? sebelum.kode };

    if (isi.aktif === false && sebelum.aktif) {
      const [turunan, pegawaiAktif] = await Promise.all([MasterRepository.jumlahTurunanAktif(id), MasterRepository.jumlahPegawaiAktif(id)]);
      if (turunan > 0 || pegawaiAktif > 0) {
        throw Unprocessable(`Unit masih punya ${turunan} unit turunan aktif dan ${pegawaiAktif} pegawai aktif. Pindahkan atau nonaktifkan lebih dulu`);
      }
    }

    return denganCekDuplikat("kode", "Kode unit sudah dipakai", () =>
      prisma.$transaction(async (tx) => {
        await MasterRepository.updateUnit(id, { ...nilai, aktif: isi.aktif ?? sebelum.aktif }, tx);
        const sesudah = await MasterRepository.unitById(id, tx);
        await AuditLogService.catat({ aktorId: aktor.id, aksi: aksiUbah(sebelum, isi.aktif), entitas: "bidang", entitasId: id, sebelum, sesudah, ...meta }, tx);
        return { id };
      }),
    );
  },

  // ---------- Pegawai ----------

  // Daftar pegawai dengan filter (filter unit ikut mencakup unit turunannya)
  async daftarPegawai(query: DaftarPegawaiQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { items, total } = await MasterRepository.daftarPegawai(
      {
        q: query.q?.trim() || undefined,
        unitIds: query.unit ? await ReferensiService.unitDanTurunan(query.unit) : undefined,
        aktif: query.aktif === undefined ? undefined : query.aktif === "1",
        tanpaAkun: query.akun === "tanpa",
      },
      { page, pageSize },
    );
    return { items, total, page, pageSize };
  },

  // Membuat pegawai baru (email opsional hanya dicek keunikannya; undangan dikirim oleh controller)
  async buatPegawai(isi: IsiPegawai, aktor: Aktor, meta: MetaRequest, email?: string | null) {
    const nilai = await validasiPegawai(isi, undefined, undefined, { email });
    return denganCekDuplikat("nip", "NIP sudah terdaftar", () =>
      prisma.$transaction(async (tx) => {
        const id = await MasterRepository.insertPegawai(nilai, tx);
        const sesudah = await MasterRepository.pegawaiById(id, tx);
        await AuditLogService.catat({ aktorId: aktor.id, aksi: "buat", entitas: "pegawai", entitasId: id, sesudah, ...meta }, tx);
        return { id };
      }),
    );
  },

  // Mengubah atau (non)aktifkan pegawai; bila nama berubah, nama akun tertaut ikut disamakan
  async ubahPegawai(id: number, isi: IsiPegawai, aktor: Aktor, meta: MetaRequest) {
    const sebelum = await MasterRepository.pegawaiById(id);
    if (!sebelum) throw NotFound("Pegawai tidak ditemukan");
    const nilai = await validasiPegawai(isi, sebelum.bidangId, sebelum.nip, { pegawaiId: id });
    return denganCekDuplikat("nip", "NIP sudah terdaftar", () =>
      prisma.$transaction(async (tx) => {
        await MasterRepository.updatePegawai(id, { ...nilai, aktif: isi.aktif ?? sebelum.aktif }, tx);
        if (nilai.nama !== sebelum.nama) await MasterRepository.samakanNamaAkun(id, nilai.nama, tx);
        const sesudah = await MasterRepository.pegawaiById(id, tx);
        await AuditLogService.catat({ aktorId: aktor.id, aksi: aksiUbah(sebelum, isi.aktif), entitas: "pegawai", entitasId: id, sebelum, sesudah, ...meta }, tx);
        return { id };
      }),
    );
  },

  // ---------- Jenis kegiatan ----------

  // Semua jenis kegiatan beserta jumlah kegiatan yang memakainya
  async daftarJenis() {
    const [jenis, jumlah] = await Promise.all([MasterRepository.daftarJenis(), MasterRepository.jumlahKegiatanPerJenis()]);
    const peta = new Map(jumlah.map((j) => [j.jenisId, j.jumlah]));
    return jenis.map((j) => ({ ...j, jumlahKegiatan: peta.get(j.id) ?? 0 }));
  },

  // Membuat jenis kegiatan baru
  async buatJenis(isi: IsiJenis, aktor: Aktor, meta: MetaRequest) {
    const nama = validasiNamaJenis(isi.nama);
    return denganCekDuplikat("nama", "Nama jenis sudah ada", () =>
      prisma.$transaction(async (tx) => {
        const id = await MasterRepository.insertJenis({ nama }, tx);
        const sesudah = await MasterRepository.jenisById(id, tx);
        await AuditLogService.catat({ aktorId: aktor.id, aksi: "buat", entitas: "jenis_kegiatan", entitasId: id, sesudah, ...meta }, tx);
        return { id };
      }),
    );
  },

  // Mengubah atau (non)aktifkan jenis kegiatan
  async ubahJenis(id: number, isi: IsiJenis, aktor: Aktor, meta: MetaRequest) {
    const sebelum = await MasterRepository.jenisById(id);
    if (!sebelum) throw NotFound("Jenis kegiatan tidak ditemukan");
    const nama = validasiNamaJenis(isi.nama);
    return denganCekDuplikat("nama", "Nama jenis sudah ada", () =>
      prisma.$transaction(async (tx) => {
        await MasterRepository.updateJenis(id, { nama, aktif: isi.aktif ?? sebelum.aktif }, tx);
        const sesudah = await MasterRepository.jenisById(id, tx);
        await AuditLogService.catat({ aktorId: aktor.id, aksi: aksiUbah(sebelum, isi.aktif), entitas: "jenis_kegiatan", entitasId: id, sebelum, sesudah, ...meta }, tx);
        return { id };
      }),
    );
  },
};
