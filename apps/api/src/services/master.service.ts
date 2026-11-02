import { NotFound, Unprocessable } from "@/lib/errors";
import { galatDuplikat, prisma } from "@/lib/prisma";
import { MasterRepository } from "@/repositories/master.repository";
import type {
  DaftarPegawaiQuery,
  IsiJenis,
  IsiJenisUnit,
  IsiPegawai,
  IsiUnit,
  JenisUnit,
  NilaiPegawai,
} from "@/types/master.types";
import type { AksiAudit, Aktor, GalatField, MetaRequest } from "@/types/umum.types";
import { periksaNip } from "@/utils/nip";
import { AuditLogService } from "./audit-log.service";
import { ReferensiService } from "./referensi.service";

const AWALAN_BAWAAN: Record<string, string> = { bidang: "BID", "sub bidang": "SUBBID", "sub bagian": "SUBAG", "kelompok fungsional": "JAFUNG" };
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

// Membuat kode unit otomatis dari jenis dan singkatan nama, contoh "BID-TIP"; ditambah "-2", "-3" bila sudah dipakai
async function buatKodeUnit(nama: string, jenis: JenisUnit) {
  const kataJenis = kataKata(jenis.nama);
  const awalan = AWALAN_BAWAAN[jenis.nama.toLowerCase()] ?? kataJenis.join("").toUpperCase().slice(0, 12);
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

// Memeriksa isian unit kerja, termasuk aturan induk sesuai jenisnya (mis. seksi harus di bawah bidang)
async function validasiUnit(isi: Omit<IsiUnit, "aktif">, sebelum?: { id: number; jenisUnitId: number }) {
  const galat: GalatField[] = [];
  const jenis = await MasterRepository.jenisUnitById(isi.jenisUnitId);
  if (!jenis) throw Unprocessable("Periksa kembali isian bidang", [{ field: "jenisUnitId", message: "Jenis unit tidak ditemukan" }]);
  if (!jenis.aktif && jenis.id !== sebelum?.jenisUnitId) galat.push({ field: "jenisUnitId", message: "Jenis unit sedang nonaktif" });

  const jenisInduk = jenis.indukJenisId == null ? null : await MasterRepository.jenisUnitById(jenis.indukJenisId);
  if (!jenisInduk && isi.parentId != null) galat.push({ field: "parentId", message: `${jenis.nama} adalah unit tertinggi, tanpa unit induk` });
  if (jenisInduk) {
    const induk = isi.parentId == null ? undefined : await MasterRepository.unitById(isi.parentId);
    if (!induk || induk.id === sebelum?.id) galat.push({ field: "parentId", message: `Unit induk wajib dipilih (${jenisInduk.nama.toLowerCase()})` });
    else if (induk.jenisUnitId !== jenisInduk.id) galat.push({ field: "parentId", message: `Induk ${jenis.nama.toLowerCase()} harus ${jenisInduk.nama.toLowerCase()}` });
    else if (!induk.aktif) galat.push({ field: "parentId", message: "Unit induk sedang nonaktif" });
  }
  if (!isi.nama.trim()) galat.push({ field: "nama", message: "Nama unit wajib diisi" });
  if (galat.length) throw Unprocessable("Periksa kembali isian bidang", galat);
  return {
    nilai: { kode: isi.kode?.trim().toUpperCase() || null, nama: isi.nama.trim(), jenisUnitId: jenis.id, parentId: jenisInduk ? isi.parentId : null },
    jenis,
  };
}

// Memeriksa isian jenis unit; jenis induk tidak boleh dirinya sendiri atau turunannya (mencegah lingkaran)
async function validasiJenisUnit(isi: Omit<IsiJenisUnit, "aktif">, sebelum?: JenisUnit) {
  const nama = isi.nama.trim();
  const galat: GalatField[] = [];
  if (!nama) galat.push({ field: "nama", message: "Nama jenis unit wajib diisi" });
  if (isi.indukJenisId != null) {
    const induk = await MasterRepository.jenisUnitById(isi.indukJenisId);
    if (!induk) galat.push({ field: "indukJenisId", message: "Jenis induk tidak ditemukan" });
    else if (!induk.aktif && induk.id !== sebelum?.indukJenisId) galat.push({ field: "indukJenisId", message: "Jenis induk sedang nonaktif" });
    else if (sebelum) {
      for (let j: JenisUnit | undefined = induk, langkah = 0; j && langkah < 50; langkah++) {
        if (j.id === sebelum.id) {
          galat.push({ field: "indukJenisId", message: "Jenis induk tidak boleh jenis ini sendiri atau turunannya" });
          break;
        }
        j = j.indukJenisId == null ? undefined : await MasterRepository.jenisUnitById(j.indukJenisId);
      }
    }
  }
  if (galat.length) throw Unprocessable("Periksa kembali isian jenis unit", galat);
  return { nama, indukJenisId: isi.indukJenisId };
}

// Memeriksa isian pegawai: NIP sah dan belum dipakai, email belum dipakai, unit kerja ada dan aktif.
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
  const unit = await MasterRepository.unitById(isi.unitKerjaId);
  if (!unit) galat.push({ field: "unitKerjaId", message: "Bidang tidak ditemukan" });
  else if (!unit.aktif && unit.id !== unitLamaId) galat.push({ field: "unitKerjaId", message: "Bidang sedang nonaktif" });
  if (galat.length) throw Unprocessable("Periksa kembali isian pegawai", galat);
  return { nip, nama: isi.nama.trim(), jabatan: teks(isi.jabatan), unitKerjaId: isi.unitKerjaId };
}

// Nama jenis kegiatan wajib diisi
function validasiNamaJenis(nama: string) {
  const bersih = nama.trim();
  if (!bersih) throw Unprocessable("Nama jenis wajib diisi", [{ field: "nama", message: "Nama jenis wajib diisi" }]);
  return bersih;
}

export const MasterService = {
  // ---------- Jenis unit ----------

  // Semua jenis unit beserta jumlah unit (semua dan aktif) yang memakainya
  async daftarJenisUnit() {
    const [jenis, jumlah] = await Promise.all([MasterRepository.daftarJenisUnit(), MasterRepository.jumlahUnitPerJenis()]);
    const peta = new Map(jumlah.map((j) => [j.jenisUnitId, j]));
    return jenis.map((j) => ({ ...j, jumlahUnit: peta.get(j.id)?.jumlah ?? 0, jumlahUnitAktif: peta.get(j.id)?.aktif ?? 0 }));
  },

  // Membuat jenis unit baru
  async buatJenisUnit(isi: IsiJenisUnit, aktor: Aktor, meta: MetaRequest) {
    const nilai = await validasiJenisUnit(isi);
    return denganCekDuplikat("nama", "Nama jenis unit sudah ada", () =>
      prisma.$transaction(async (tx) => {
        const id = await MasterRepository.insertJenisUnit(nilai, tx);
        const sesudah = await MasterRepository.jenisUnitById(id, tx);
        await AuditLogService.catat({ aktorId: aktor.id, aksi: "buat", entitas: "jenis_unit", entitasId: id, sesudah, ...meta }, tx);
        return { id };
      }),
    );
  },

  // Mengubah atau (non)aktifkan jenis unit; ditolak bila masih dipakai unit aktif
  async ubahJenisUnit(id: number, isi: IsiJenisUnit, aktor: Aktor, meta: MetaRequest) {
    const sebelum = await MasterRepository.jenisUnitById(id);
    if (!sebelum) throw NotFound("Jenis unit tidak ditemukan");
    const nilai = await validasiJenisUnit(isi, sebelum);

    if (nilai.indukJenisId !== sebelum.indukJenisId && (await MasterRepository.jumlahUnitAktifBerjenis(id)) > 0) {
      throw Unprocessable("Posisi jenis tidak dapat diubah selama masih ada unit aktif berjenis ini", [
        { field: "indukJenisId", message: "Pindahkan atau nonaktifkan unit berjenis ini lebih dulu" },
      ]);
    }
    if (isi.aktif === false && sebelum.aktif) {
      const [unitAktif, jenisTurunan] = await Promise.all([MasterRepository.jumlahUnitAktifBerjenis(id), MasterRepository.jumlahJenisTurunanAktif(id)]);
      if (unitAktif > 0 || jenisTurunan > 0) {
        throw Unprocessable(`Jenis ini masih dipakai ${unitAktif} unit aktif dan menjadi induk ${jenisTurunan} jenis aktif. Pindahkan atau nonaktifkan lebih dulu`);
      }
    }

    return denganCekDuplikat("nama", "Nama jenis unit sudah ada", () =>
      prisma.$transaction(async (tx) => {
        await MasterRepository.updateJenisUnit(id, { ...nilai, aktif: isi.aktif ?? sebelum.aktif }, tx);
        const sesudah = await MasterRepository.jenisUnitById(id, tx);
        await AuditLogService.catat({ aktorId: aktor.id, aksi: aksiUbah(sebelum, isi.aktif), entitas: "jenis_unit", entitasId: id, sebelum, sesudah, ...meta }, tx);
        return { id };
      }),
    );
  },

  // ---------- Unit kerja ----------

  // Semua unit kerja beserta jumlah pegawai aktifnya
  async daftarUnit() {
    const [unit, jumlah] = await Promise.all([MasterRepository.daftarUnit(), MasterRepository.jumlahPegawaiPerUnit()]);
    const peta = new Map(jumlah.map((j) => [j.unitKerjaId, j.jumlah]));
    return unit.map((u) => ({ ...u, jumlahPegawaiAktif: peta.get(u.id) ?? 0 }));
  },

  // Membuat unit kerja; kode dibuat otomatis bila dikosongkan
  async buatUnit(isi: IsiUnit, aktor: Aktor, meta: MetaRequest) {
    const { nilai: isian, jenis } = await validasiUnit(isi);
    const nilai = { ...isian, kode: isian.kode ?? (await buatKodeUnit(isian.nama, jenis)) };
    return denganCekDuplikat("kode", "Kode unit sudah dipakai", () =>
      prisma.$transaction(async (tx) => {
        const id = await MasterRepository.insertUnit(nilai, tx);
        const sesudah = await MasterRepository.unitById(id, tx);
        await AuditLogService.catat({ aktorId: aktor.id, aksi: "buat", entitas: "unit_kerja", entitasId: id, sesudah, ...meta }, tx);
        return { id };
      }),
    );
  },

  // Mengubah atau (non)aktifkan unit kerja; ditolak bila masih punya turunan/pegawai aktif
  async ubahUnit(id: number, isi: IsiUnit, aktor: Aktor, meta: MetaRequest) {
    const sebelum = await MasterRepository.unitById(id);
    if (!sebelum) throw NotFound("Bidang tidak ditemukan");
    const { nilai: isian } = await validasiUnit(isi, sebelum);
    const nilai = { ...isian, kode: isian.kode ?? sebelum.kode };

    if (nilai.jenisUnitId !== sebelum.jenisUnitId && (await MasterRepository.jumlahTurunanAktif(id)) > 0) {
      throw Unprocessable("Jenis unit tidak dapat diubah selama masih punya unit turunan aktif", [
        { field: "jenisUnitId", message: "Pindahkan atau nonaktifkan unit turunannya lebih dulu" },
      ]);
    }
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
        await AuditLogService.catat({ aktorId: aktor.id, aksi: aksiUbah(sebelum, isi.aktif), entitas: "unit_kerja", entitasId: id, sebelum, sesudah, ...meta }, tx);
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
    const nilai = await validasiPegawai(isi, sebelum.unitKerjaId, sebelum.nip, { pegawaiId: id });
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
