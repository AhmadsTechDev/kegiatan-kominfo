import { NotFound, Unprocessable } from "@/lib/errors";
import { db, galatDuplikat } from "@/db";
import { MasterRepository } from "@/repositories/master.repository";
import type {
  DaftarPegawaiQuery,
  IsiJenis,
  IsiPegawai,
  IsiPegawaiBaru,
  IsiUnit,
  NilaiPegawai,
} from "@/types/master.types";
import type { GalatField } from "@/types/umum.types";
import { periksaNip } from "@/utils/nip";
import { ReferensiService } from "./referensi.service";
import { UndanganService } from "./undangan.service";

const AWALAN_BAWAAN: Record<string, string> = { bidang: "BID", "sub bidang": "SUBBID" };
const KATA_SAMBUNG = new Set(["dan", "serta", "atau", "di", "ke", "dari", "yang", "untuk", "pada"]);

const teks = (nilai: string | null | undefined) => nilai?.trim() || null;

const kataKata = (s: string) => s.split(/[^A-Za-z0-9]+/).filter(Boolean);

async function denganCekDuplikat<T>(field: string, pesan: string, kerja: () => Promise<T>) {
  try {
    return await kerja();
  } catch (e) {
    if (galatDuplikat(e)) throw Unprocessable(pesan, [{ field, message: pesan }]);
    throw e;
  }
}

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

function validasiNamaJenis(nama: string) {
  const bersih = nama.trim();
  if (!bersih) throw Unprocessable("Nama jenis wajib diisi", [{ field: "nama", message: "Nama jenis wajib diisi" }]);
  return bersih;
}

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
  return { nip, nama: isi.nama.trim(), bidangId: isi.bidangId };
}

export const MasterService = {

  async daftarUnit() {
    const [unit, jumlah] = await Promise.all([MasterRepository.daftarUnit(), MasterRepository.jumlahPegawaiPerUnit()]);

    const peta = new Map(jumlah.map((j) => [j.bidangId, j.jumlah]));
    const pakai = await MasterRepository.pemakaian(unit.map((u) => u.id));
    return unit.map((u) => {
      const p = pakai.get(u.id)!;
      return { ...u, jumlahPegawaiAktif: peta.get(u.id) ?? 0, bisaDihapus: p.pegawai + p.kegiatan + p.turunan === 0 };
    });
  },

  async buatUnit(isi: IsiUnit) {
    const { nilai: isian, namaJenis } = await validasiUnit(isi);
    const nilai = { ...isian, kode: isian.kode ?? (await buatKodeUnit(isian.nama, namaJenis)) };
    return denganCekDuplikat("kode", "Kode unit sudah dipakai", () =>
      db.transaction(async (tx) => {
        const id = await MasterRepository.insertUnit(nilai, tx);
        return { id };
      }),
    );
  },

  async ubahUnit(id: number, isi: IsiUnit) {
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
      db.transaction(async (tx) => {
        await MasterRepository.updateUnit(id, { ...nilai, aktif: isi.aktif ?? sebelum.aktif }, tx);
        return { id };
      }),
    );
  },

  async hapusUnit(id: number) {
    if (!(await MasterRepository.unitById(id))) throw NotFound("Bidang tidak ditemukan");
    const p = (await MasterRepository.pemakaian([id])).get(id)!;
    if (p.pegawai + p.kegiatan + p.turunan > 0) {
      const bagian = [p.pegawai && `${p.pegawai} pegawai`, p.kegiatan && `${p.kegiatan} kegiatan`, p.turunan && `${p.turunan} sub bidang`].filter(Boolean).join(", ");
      throw Unprocessable(`Tidak dapat dihapus karena masih punya ${bagian}. Nonaktifkan saja agar riwayatnya tetap utuh`);
    }
    await db.transaction(async (tx) => {
      await MasterRepository.hapusUnit(id, tx);
    });
    return { id };
  },

  async hapusPegawai(id: number) {
    if (!(await MasterRepository.pegawaiById(id))) throw NotFound("Pegawai tidak ditemukan");
    const p = await MasterRepository.pemakaianPegawai(id);
    if (p.akun > 0) throw Unprocessable("Pegawai ini sudah punya akun. Kelola lewat tab Akun");
    if (p.kegiatan + p.permintaan > 0) {
      const bagian = [p.kegiatan && `${p.kegiatan} kegiatan`, p.permintaan && `${p.permintaan} permintaan akun`].filter(Boolean).join(", ");
      throw Unprocessable(`Tidak dapat dihapus karena masih tercatat di ${bagian}. Nonaktifkan saja agar riwayatnya tetap utuh`);
    }
    await db.transaction(async (tx) => {
      await MasterRepository.hapusPegawai(id, tx);
    });
    return { id };
  },

  async daftarPegawai(query: DaftarPegawaiQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { items, total } = await MasterRepository.daftarPegawai(
      {
        q: query.q?.trim() || undefined,
        unitIds: query.unit ? await ReferensiService.unitDanTurunan(query.unit) : undefined,
        aktif: query.aktif === undefined ? undefined : query.aktif === "1",
        akun: query.akun,
      },
      { page, pageSize },
    );
    return { items, total, page, pageSize };
  },

  async buatPegawai(isi: IsiPegawai, email?: string | null) {
    const nilai = await validasiPegawai(isi, undefined, undefined, { email });
    return denganCekDuplikat("nip", "NIP sudah terdaftar", () =>
      db.transaction(async (tx) => {
        const id = await MasterRepository.insertPegawai(nilai, tx);
        return { id };
      }),
    );
  },

  async buatPegawaiDenganUndangan(body: IsiPegawaiBaru) {
    const { email: emailMentah, role, ...isi } = body;
    const email = emailMentah?.trim().toLowerCase() || null;
    const { id } = await MasterService.buatPegawai(isi, email);
    if (!email) return { id, undangan: null };
    try {
      const hasil = await UndanganService.undang({ pegawaiId: id, email, role: role ?? "PEGAWAI" });
      return { id, undangan: { email: hasil.email, galat: null } };
    } catch (e) {
      return { id, undangan: { email, galat: e instanceof Error ? e.message : "Undangan gagal dikirim" } };
    }
  },

  async ubahPegawai(id: number, isi: IsiPegawai) {
    const sebelum = await MasterRepository.pegawaiById(id);
    if (!sebelum) throw NotFound("Pegawai tidak ditemukan");
    const nilai = await validasiPegawai(isi, sebelum.bidangId, sebelum.nip, { pegawaiId: id });
    const akun = await MasterRepository.akunPegawai(id);
    const kontak = isi.kontak === undefined ? undefined : isi.kontak?.trim() || null;
    if (kontak && !akun) {
      throw Unprocessable("Nomor telepon bisa diisi setelah pegawai punya akun", [{ field: "kontak", message: "Undang pegawai ini dulu, lalu isi nomor teleponnya" }]);
    }
    return denganCekDuplikat("nip", "NIP sudah terdaftar", () =>
      db.transaction(async (tx) => {
        await MasterRepository.updatePegawai(id, { ...nilai, aktif: isi.aktif ?? sebelum.aktif, ...(isi.roleUndangan ? { roleUndangan: isi.roleUndangan } : {}) }, tx);

        if (nilai.nama !== sebelum.nama) await MasterRepository.samakanNamaAkun(id, nilai.nama, tx);
        if (akun && kontak !== undefined && kontak !== akun.kontak) await MasterRepository.ubahKontakAkun(akun.id, kontak, tx);
        return { id };
      }),
    );
  },

  async daftarJenis() {
    const [jenis, jumlah] = await Promise.all([MasterRepository.daftarJenis(), MasterRepository.jumlahKegiatanPerJenis()]);
    const peta = new Map(jumlah.map((j) => [j.jenisId, j.jumlah]));
    return jenis.map((j) => ({ ...j, jumlahKegiatan: peta.get(j.id) ?? 0 }));
  },

  async buatJenis(isi: IsiJenis) {
    const nama = validasiNamaJenis(isi.nama);
    return denganCekDuplikat("nama", "Nama jenis sudah ada", () =>
      db.transaction(async (tx) => {
        const id = await MasterRepository.insertJenis({ nama }, tx);
        return { id };
      }),
    );
  },

  async ubahJenis(id: number, isi: IsiJenis) {
    const sebelum = await MasterRepository.jenisById(id);
    if (!sebelum) throw NotFound("Jenis kegiatan tidak ditemukan");
    const nama = validasiNamaJenis(isi.nama);
    return denganCekDuplikat("nama", "Nama jenis sudah ada", () =>
      db.transaction(async (tx) => {
        await MasterRepository.updateJenis(id, { nama, aktif: isi.aktif ?? sebelum.aktif }, tx);
        return { id };
      }),
    );
  },
};
