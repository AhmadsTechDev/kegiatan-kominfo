// =============================================================================
// KLIEN API ADMINISTRASI DAN MASTER DATA
// =============================================================================
// Gunanya: menyediakan fungsi pemanggil HTTP ke backend untuk pengelolaan
// master data, akun pengguna, jejak audit log, dan persetujuan permintaan akun.
//
// Isi berkas:
//   - getUnitKerja, buatUnitKerja, ubahUnitKerja : API master unit kerja
//   - getJenisUnit, buatJenisUnit, ubahJenisUnit : API tingkatan jenis unit
//   - getPegawai, buatPegawai, ubahPegawai : API master pegawai
//   - imporPegawai, unduhTemplatPegawai : impor massal dan templat Excel pegawai
//   - getJenisKegiatan, buatJenisKegiatan, ubahJenisKegiatan : API jenis kegiatan
//   - getAkun, getDetailAkun, buatAkun, ubahAkun, nonaktifkanAkun, aktifkanAkun, hapusAkun : API akun
//   - kirimUlangUndangan, resetSandiAkun, cabutSesiAkun, undangPegawai : aksi akun lainnya
//   - getAuditLog, getAuditDetail, getPilihanAudit : API jejak audit aktivitas
//   - getPermintaanAkun, getJumlahPermintaan, setujuiPermintaan, tolakPermintaan : API permintaan akun
//
// Catatan penting:
//   - Mendukung kebutuhan master data (FR-02) dan jejak audit aktivitas (FR-03).
//   - Menggunakan FormData untuk unggah Excel dan Blob URL untuk unduh templat.
//
// Dipakai oleh: use-admin.ts, komponen-komponen fitur admin
// =============================================================================

import { apiClient } from "@/lib/api-client";
import type {
  AkunAdmin,
  AkunDetail,
  HasilSimpanAkun,
  AuditDetail,
  AuditItem,
  FilterAkun,
  FilterAudit,
  FilterPegawai,
  Halaman,
  HasilImpor,
  IsiAkun,
  IsiUndangan,
  IsiPegawai,
  IsiPegawaiBaru,
  HasilPegawaiBaru,
  IsiJenisUnit,
  IsiUnit,
  JenisUnitAdmin,
  JenisKegiatanAdmin,
  PegawaiAdmin,
  PermintaanAkun,
  StatusPermintaan,
  PilihanAudit,
  UnitKerjaAdmin,
} from "../types";

export const UKURAN_HALAMAN_ADMIN = 20;
export const UKURAN_HALAMAN_AUDIT = 25;

const params = (nilai: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(nilai).filter(([, v]) => v !== null && v !== "" && v !== undefined));

type Hasil<T = number> = { id: T };

export const getUnitKerja = () => apiClient.get<UnitKerjaAdmin[]>("/admin/unit-kerja").then((r) => r.data);
export const buatUnitKerja = (isi: IsiUnit) => apiClient.post<Hasil>("/admin/unit-kerja", isi).then((r) => r.data);
export const ubahUnitKerja = (id: number, isi: IsiUnit) => apiClient.patch<Hasil>(`/admin/unit-kerja/${id}`, isi).then((r) => r.data);

export const getJenisUnit = () => apiClient.get<JenisUnitAdmin[]>("/admin/jenis-unit").then((r) => r.data);
export const buatJenisUnit = (isi: IsiJenisUnit) => apiClient.post<Hasil>("/admin/jenis-unit", isi).then((r) => r.data);
export const ubahJenisUnit = (id: number, isi: IsiJenisUnit) => apiClient.patch<Hasil>(`/admin/jenis-unit/${id}`, isi).then((r) => r.data);

export const getPegawai = (f: FilterPegawai) =>
  apiClient
    .get<Halaman<PegawaiAdmin>>("/admin/pegawai", { params: params({ ...f, q: f.q.trim(), pageSize: UKURAN_HALAMAN_ADMIN }) })
    .then((r) => r.data);
export const buatPegawai = (isi: IsiPegawaiBaru) => apiClient.post<HasilPegawaiBaru>("/admin/pegawai", isi).then((r) => r.data);
export const ubahPegawai = (id: number, isi: IsiPegawai) => apiClient.patch<Hasil>(`/admin/pegawai/${id}`, isi).then((r) => r.data);

export const imporPegawai = (berkas: File, simpan: boolean) => {
  const form = new FormData();
  form.append("berkas", berkas);
  if (simpan) form.append("simpan", "1");
  return apiClient.post<HasilImpor>("/admin/pegawai/impor", form).then((r) => r.data);
};

export async function unduhTemplatPegawai() {
  const res = await apiClient.get<Blob>("/admin/pegawai/impor/templat", { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "templat-impor-pegawai.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const getJenisKegiatan = () => apiClient.get<JenisKegiatanAdmin[]>("/admin/jenis-kegiatan").then((r) => r.data);
export const buatJenisKegiatan = (isi: { nama: string }) => apiClient.post<Hasil>("/admin/jenis-kegiatan", isi).then((r) => r.data);
export const ubahJenisKegiatan = (id: number, isi: { nama: string; aktif?: boolean }) =>
  apiClient.patch<Hasil>(`/admin/jenis-kegiatan/${id}`, isi).then((r) => r.data);

export const getAkun = (f: FilterAkun) =>
  apiClient
    .get<Halaman<AkunAdmin>>("/admin/akun", { params: params({ ...f, q: f.q.trim(), pageSize: UKURAN_HALAMAN_ADMIN }) })
    .then((r) => r.data);
export const getDetailAkun = (id: string) => apiClient.get<AkunDetail>(`/admin/akun/${id}`).then((r) => r.data);
export const buatAkun = (isi: IsiAkun) => apiClient.post<HasilSimpanAkun>("/admin/akun", isi).then((r) => r.data);
export const ubahAkun = (id: string, isi: IsiAkun) => apiClient.patch<HasilSimpanAkun>(`/admin/akun/${id}`, isi).then((r) => r.data);
export const nonaktifkanAkun = (id: string, alasan: string) =>
  apiClient.post<Hasil<string>>(`/admin/akun/${id}/nonaktifkan`, { alasan }).then((r) => r.data);
export const aktifkanAkun = (id: string) => apiClient.post<Hasil<string>>(`/admin/akun/${id}/aktifkan`).then((r) => r.data);
export const hapusAkun = (id: string) => apiClient.delete<Hasil<string>>(`/admin/akun/${id}`).then((r) => r.data);
export const kirimUlangUndangan = (id: string) =>
  apiClient.post<{ id: string; email: string; kedaluwarsa: string }>(`/admin/akun/${id}/kirim-ulang-undangan`).then((r) => r.data);
export const resetSandiAkun = (id: string) =>
  apiClient.post<{ id: string; email: string; sesiDicabut: number }>(`/admin/akun/${id}/reset-sandi`).then((r) => r.data);
export const cabutSesiAkun = (id: string) => apiClient.post<{ id: string; jumlah: number }>(`/admin/akun/${id}/cabut-sesi`).then((r) => r.data);

export const getAuditLog = (f: FilterAudit) =>
  apiClient.get<Halaman<AuditItem>>("/audit-log", { params: params({ ...f, pageSize: UKURAN_HALAMAN_AUDIT }) }).then((r) => r.data);
export const getAuditDetail = (id: number) => apiClient.get<AuditDetail>(`/audit-log/${id}`).then((r) => r.data);
export const getPilihanAudit = () => apiClient.get<PilihanAudit>("/audit-log/pilihan").then((r) => r.data);

export const undangPegawai = (pegawaiId: number, isi: IsiUndangan) =>
  apiClient.post<{ userId: string; email: string; kirimUlang: boolean }>(`/admin/pegawai/${pegawaiId}/undang`, isi).then((r) => r.data);

export const getPermintaanAkun = (f: { status: StatusPermintaan | null; page: number }) =>
  apiClient
    .get<Halaman<PermintaanAkun> & { jumlahMenunggu: number }>("/admin/permintaan-akun", {
      params: params({ ...f, pageSize: UKURAN_HALAMAN_ADMIN }),
    })
    .then((r) => r.data);
export const getJumlahPermintaan = () => apiClient.get<{ menunggu: number }>("/admin/permintaan-akun/jumlah").then((r) => r.data);
export const setujuiPermintaan = (id: number, isi: IsiUndangan) =>
  apiClient.post<{ email: string }>(`/admin/permintaan-akun/${id}/setujui`, isi).then((r) => r.data);
export const tolakPermintaan = (id: number, alasan: string) =>
  apiClient.post<Hasil>(`/admin/permintaan-akun/${id}/tolak`, { alasan }).then((r) => r.data);
