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
import type { GalatField } from "@/types/umum.types";
import { periksaNip } from "@/utils/nip";
import { ReferensiService } from "./referensi.service";

/**
 * Service master data: bidang/sub bidang, pegawai, dan jenis kegiatan (khusus admin).
 * Pola umum di file ini: validasi isian -> simpan di dalam transaksi ->
 * ubah galat UNIQUE dari database menjadi pesan yang ramah (denganCekDuplikat).
 * Data yang sudah dipakai kegiatan tidak dihapus, cukup dinonaktifkan, supaya riwayat lama tetap bisa dibaca.
 *
 * Awalan kode otomatis per tingkat; KATA_SAMBUNG dilewati saat membuat singkatan nama.
 */
const AWALAN_BAWAAN: Record<string, string> = { bidang: "BID", "sub bidang": "SUBBID" };
const KATA_SAMBUNG = new Set(["dan", "serta", "atau", "di", "ke", "dari", "yang", "untuk", "pada"]);

/**
 * Merapikan teks opsional: dipangkas, teks kosong menjadi null
 */
const teks = (nilai: string | null | undefined) => nilai?.trim() || null;

/**
 * Memecah teks menjadi kata (huruf/angka saja)
 */
const kataKata = (s: string) => s.split(/[^A-Za-z0-9]+/).filter(Boolean);

/**
 * Menjalankan `kerja`; bila gagal karena data UNIQUE kembar, ubah menjadi galat 422 yang ramah
 *
 * KONSEP callback: `kerja` adalah fungsi yang diteruskan sebagai parameter dan baru dijalankan di dalam fungsi ini.
 * @param field nama kolom form tempat pesan galat ditampilkan
 * @param pesan pesan untuk pengguna bila data kembar
 * @param kerja proses yang dijalankan (biasanya transaksi simpan)
 * @returns hasil dari `kerja`
 * @throws Unprocessable bila database menolak karena nilai UNIQUE sudah dipakai
 */
async function denganCekDuplikat<T>(field: string, pesan: string, kerja: () => Promise<T>) {
  try {
    return await kerja();
  } catch (e) {
    if (galatDuplikat(e)) throw Unprocessable(pesan, [{ field, message: pesan }]);
    throw e;
  }
}

/**
 * Membuat kode otomatis dari tingkat dan singkatan nama, contoh "BID-TIP"; ditambah "-2", "-3" bila sudah dipakai
 *
 * Contoh: nama "Bidang Teknologi Informasi dan Persandian", jenis "Bidang"
 * -> kata "Bidang" di depan dibuang, kata sambung "dan" dilewati, huruf pertama tiap kata diambil -> "BID-TIP".
 * Bila kode itu sudah ada, dicoba "BID-TIP-2", "BID-TIP-3", dan seterusnya.
 * @param nama nama bidang yang diisi admin
 * @param namaJenis "Bidang" atau "Sub bidang"
 * @returns kode unik yang belum dipakai
 */
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

  /**
   * Perulangan tanpa batas akhir (;;) aman di sini karena pasti berhenti begitu menemukan nomor yang belum dipakai.
   */
  for (let i = 2; ; i++) if (!terpakai.has(`${dasar}-${i}`)) return `${dasar}-${i}`;
}

/**
 * Memeriksa isian bidang. Tanpa induk berarti bidang; dengan induk berarti sub bidang, dan induknya harus sebuah bidang (maksimal dua tingkat)
 *
 * Struktur bidang maksimal dua tingkat: Bidang -> Sub bidang. Karena itu induk harus berupa bidang (bukan sub bidang),
 * tidak boleh dirinya sendiri, dan bidang yang sudah punya sub bidang tidak bisa dipindah menjadi sub bidang.
 * @param isi isian form bidang
 * @param sebelum data lama saat mengubah (kosong saat membuat baru)
 * @returns nilai kolom yang sudah dirapikan dan nama tingkatnya ("Bidang"/"Sub bidang")
 * @throws Unprocessable berisi daftar kolom yang salah
 */
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

/**
 * Memeriksa isian pegawai: NIP sah dan belum dipakai, email belum dipakai, bidang ada dan aktif.
 * Juga dipakai user.service.ts saat admin membuat/mengubah akun beserta data pegawainya
 *
 * @param isi isian form pegawai (nip, nama, bidangId)
 * @param unitLamaId bidang lama; boleh tetap dipakai walau sekarang nonaktif
 * @param nipLama NIP lama; tidak dicek ulang bila tidak berubah
 * @param opsi pegawaiId (agar NIP miliknya sendiri tidak dianggap kembar) dan email yang ikut dicek keunikannya
 * @returns nilai kolom pegawai yang siap disimpan
 * @throws Unprocessable berisi daftar kolom yang salah
 */
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

/**
 * Nama jenis kegiatan wajib diisi
 */
function validasiNamaJenis(nama: string) {
  const bersih = nama.trim();
  if (!bersih) throw Unprocessable("Nama jenis wajib diisi", [{ field: "nama", message: "Nama jenis wajib diisi" }]);
  return bersih;
}

export const MasterService = {
  /**
   * ---------- Bidang ----------
   */

  /**
   * Semua bidang beserta jumlah pegawai aktifnya
   */
  async daftarUnit() {
    const [unit, jumlah] = await Promise.all([MasterRepository.daftarUnit(), MasterRepository.jumlahPegawaiPerUnit()]);

    /**
     * KONSEP Map: struktur "kunci -> nilai" untuk mencari cepat. Hasil hitung per bidang diubah menjadi Map
     * agar jumlah pegawai setiap bidang bisa diambil langsung lewat peta.get(id) tanpa mencari di array berulang kali.
     */
    const peta = new Map(jumlah.map((j) => [j.bidangId, j.jumlah]));
    const pakai = await MasterRepository.pemakaian(unit.map((u) => u.id));
    return unit.map((u) => {
      const p = pakai.get(u.id)!;
      return { ...u, jumlahPegawaiAktif: peta.get(u.id) ?? 0, bisaDihapus: p.pegawai + p.kegiatan + p.turunan === 0 };
    });
  },

  /**
   * Membuat bidang; kode dibuat otomatis bila dikosongkan
   */
  async buatUnit(isi: IsiUnit) {
    const { nilai: isian, namaJenis } = await validasiUnit(isi);
    const nilai = { ...isian, kode: isian.kode ?? (await buatKodeUnit(isian.nama, namaJenis)) };
    return denganCekDuplikat("kode", "Kode unit sudah dipakai", () =>
      prisma.$transaction(async (tx) => {
        const id = await MasterRepository.insertUnit(nilai, tx);
        return { id };
      }),
    );
  },

  /**
   * Mengubah atau (non)aktifkan bidang; ditolak bila masih punya turunan/pegawai aktif
   */
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
      prisma.$transaction(async (tx) => {
        await MasterRepository.updateUnit(id, { ...nilai, aktif: isi.aktif ?? sebelum.aktif }, tx);
        return { id };
      }),
    );
  },

  /**
   * Menghapus bidang atau sub bidang secara permanen; ditolak bila masih punya pegawai, kegiatan, atau sub bidang
   * (yang sudah dipakai cukup dinonaktifkan agar riwayat kegiatannya tetap utuh)
   */
  async hapusUnit(id: number) {
    if (!(await MasterRepository.unitById(id))) throw NotFound("Bidang tidak ditemukan");
    const p = (await MasterRepository.pemakaian([id])).get(id)!;
    if (p.pegawai + p.kegiatan + p.turunan > 0) {
      /**
       * Menyusun daftar penyebab yang ada saja, mis. "3 pegawai, 2 kegiatan"; nilai 0 tersaring oleh filter(Boolean).
       */
      const bagian = [p.pegawai && `${p.pegawai} pegawai`, p.kegiatan && `${p.kegiatan} kegiatan`, p.turunan && `${p.turunan} sub bidang`].filter(Boolean).join(", ");
      throw Unprocessable(`Tidak dapat dihapus karena masih punya ${bagian}. Nonaktifkan saja agar riwayatnya tetap utuh`);
    }
    await prisma.$transaction(async (tx) => {
      await MasterRepository.hapusUnit(id, tx);
    });
    return { id };
  },

  /**
   * ---------- Pegawai ----------
   */

  /**
   * Hapus permanen pegawai yang belum punya akun dan belum dipakai kegiatan atau permintaan akun.
   * Yang sudah dipakai cukup dinonaktifkan agar riwayatnya tetap utuh
   */
  async hapusPegawai(id: number) {
    if (!(await MasterRepository.pegawaiById(id))) throw NotFound("Pegawai tidak ditemukan");
    const p = await MasterRepository.pemakaianPegawai(id);
    if (p.akun > 0) throw Unprocessable("Pegawai ini sudah punya akun. Kelola lewat tab Akun");
    if (p.kegiatan + p.permintaan > 0) {
      const bagian = [p.kegiatan && `${p.kegiatan} kegiatan`, p.permintaan && `${p.permintaan} permintaan akun`].filter(Boolean).join(", ");
      throw Unprocessable(`Tidak dapat dihapus karena masih tercatat di ${bagian}. Nonaktifkan saja agar riwayatnya tetap utuh`);
    }
    await prisma.$transaction(async (tx) => {
      await MasterRepository.hapusPegawai(id, tx);
    });
    return { id };
  },

  /**
   * Daftar pegawai dengan filter (filter unit ikut mencakup unit turunannya)
   */
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

  /**
   * Membuat pegawai baru (email opsional hanya dicek keunikannya; undangan dikirim oleh controller)
   */
  async buatPegawai(isi: IsiPegawai, email?: string | null) {
    const nilai = await validasiPegawai(isi, undefined, undefined, { email });
    return denganCekDuplikat("nip", "NIP sudah terdaftar", () =>
      prisma.$transaction(async (tx) => {
        const id = await MasterRepository.insertPegawai(nilai, tx);
        return { id };
      }),
    );
  },

  /**
   * Mengubah atau (non)aktifkan pegawai; bila nama berubah, nama akun tertaut ikut disamakan.
   * Nomor telepon (kontak) disimpan di akun tertaut, jadi hanya bisa diisi bila akunnya ada
   */
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
      prisma.$transaction(async (tx) => {
        await MasterRepository.updatePegawai(id, { ...nilai, aktif: isi.aktif ?? sebelum.aktif, ...(isi.roleUndangan ? { roleUndangan: isi.roleUndangan } : {}) }, tx);

        /**
         * Nama di akun login disamakan dengan nama pegawai agar tidak ada dua versi nama orang yang sama.
         */
        if (nilai.nama !== sebelum.nama) await MasterRepository.samakanNamaAkun(id, nilai.nama, tx);
        if (akun && kontak !== undefined && kontak !== akun.kontak) await MasterRepository.ubahKontakAkun(akun.id, kontak, tx);
        return { id };
      }),
    );
  },

  /**
   * ---------- Jenis kegiatan ----------
   */

  /**
   * Semua jenis kegiatan beserta jumlah kegiatan yang memakainya
   */
  async daftarJenis() {
    const [jenis, jumlah] = await Promise.all([MasterRepository.daftarJenis(), MasterRepository.jumlahKegiatanPerJenis()]);
    const peta = new Map(jumlah.map((j) => [j.jenisId, j.jumlah]));
    return jenis.map((j) => ({ ...j, jumlahKegiatan: peta.get(j.id) ?? 0 }));
  },

  /**
   * Membuat jenis kegiatan baru
   */
  async buatJenis(isi: IsiJenis) {
    const nama = validasiNamaJenis(isi.nama);
    return denganCekDuplikat("nama", "Nama jenis sudah ada", () =>
      prisma.$transaction(async (tx) => {
        const id = await MasterRepository.insertJenis({ nama }, tx);
        return { id };
      }),
    );
  },

  /**
   * Mengubah atau (non)aktifkan jenis kegiatan
   */
  async ubahJenis(id: number, isi: IsiJenis) {
    const sebelum = await MasterRepository.jenisById(id);
    if (!sebelum) throw NotFound("Jenis kegiatan tidak ditemukan");
    const nama = validasiNamaJenis(isi.nama);
    return denganCekDuplikat("nama", "Nama jenis sudah ada", () =>
      prisma.$transaction(async (tx) => {
        await MasterRepository.updateJenis(id, { nama, aktif: isi.aktif ?? sebelum.aktif }, tx);
        return { id };
      }),
    );
  },
};
