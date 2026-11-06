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
  IsiAkun,
  IsiUndangan,
  IsiPegawai,
  IsiPegawaiBaru,
  HasilPegawaiBaru,
  IsiUnit,
  JenisKegiatanAdmin,
  PegawaiAdmin,
  PermintaanAkun,
  StatusPermintaan,
  PilihanAudit,
  BidangAdmin,
} from "../types";

/**
 * Pemanggil endpoint admin: master data, akun, audit log, dan permintaan akun
 */

export const UKURAN_HALAMAN_ADMIN = 20;
export const UKURAN_HALAMAN_AUDIT = 25;

const params = (nilai: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(nilai).filter(([, v]) => v !== null && v !== "" && v !== undefined));

type Hasil<T = number> = { id: T };

/**
 * Pola singkat `.then((r) => r.data)`: apiClient mengembalikan objek respons axios lengkap,
 * lalu `.then` mengambil bagian `data` (isi JSON dari backend) saja. Hasilnya sama dengan memakai async/await.
 */
export const getBidang = () => apiClient.get<BidangAdmin[]>("/admin/bidang").then((r) => r.data);
export const buatBidang = (isi: IsiUnit) => apiClient.post<Hasil>("/admin/bidang", isi).then((r) => r.data);
export const ubahBidang = (id: number, isi: IsiUnit) => apiClient.patch<Hasil>(`/admin/bidang/${id}`, isi).then((r) => r.data);
export const hapusBidang = (id: number) => apiClient.delete<Hasil>(`/admin/bidang/${id}`).then((r) => r.data);

export const getPegawai = (f: FilterPegawai) =>
  apiClient
    .get<Halaman<PegawaiAdmin>>("/admin/pegawai", { params: params({ ...f, q: f.q.trim(), pageSize: UKURAN_HALAMAN_ADMIN }) })
    .then((r) => r.data);
export const buatPegawai = (isi: IsiPegawaiBaru) => apiClient.post<HasilPegawaiBaru>("/admin/pegawai", isi).then((r) => r.data);
export const ubahPegawai = (id: number, isi: IsiPegawai) => apiClient.patch<Hasil>(`/admin/pegawai/${id}`, isi).then((r) => r.data);
export const hapusPegawai = (id: number) => apiClient.delete<Hasil>(`/admin/pegawai/${id}`).then((r) => r.data);

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
