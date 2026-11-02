// =============================================================================
// API AKUN PUBLIK (TANPA LOGIN)
// =============================================================================
// Gunanya: Menyediakan fungsi pemanggilan API publik untuk menghubungi administrator dan
// alur tautan email: aktivasi akun, lupa/atur ulang kata sandi, dan verifikasi email baru.
//
// Isi berkas:
//   - ajukanPermintaanAkun : mengirim pesan permintaan akses ke administrator (/permintaan-akun)
//   - getInfoAktivasi, aktifkanAkun : cek token undangan lalu membuat kata sandi pertama
//   - mintaResetSandi : meminta tautan atur ulang kata sandi (jawaban selalu sama)
//   - getInfoReset, resetSandi : cek token atur ulang lalu membuat kata sandi baru
//   - konfirmasiEmail : memverifikasi email baru dari tautan di email
//
// Catatan penting:
//   - Token tautan yang salah, kedaluwarsa, atau sudah dipakai dijawab 410 TOKEN_TIDAK_BERLAKU.
//
// Dipakai oleh: MintaAkunForm, AktivasiForm, LupaSandiForm, ResetSandiForm, KonfirmasiEmailView
// =============================================================================

import { ApiError, apiClient } from "@/lib/api-client";

export type IsiPermintaanAkun = { nama: string; nip: string | null; email: string; catatan: string | null };
export type InfoAktivasi = { nama: string; email: string; kedaluwarsa: string };
export type InfoReset = { email: string; kedaluwarsa: string };

export const tokenTidakBerlaku = (e: unknown) => e instanceof ApiError && e.code === "TOKEN_TIDAK_BERLAKU";

// Untuk cek token (GET): 422 berarti format token di URL rusak, jadi tautannya juga tidak berlaku.
// Galat lain (server, jaringan, 429) bukan masalah tautan dan harus bisa dicoba lagi
export const tautanRusak = (e: unknown) => tokenTidakBerlaku(e) || (e instanceof ApiError && e.status === 422);

export const ajukanPermintaanAkun = (isi: IsiPermintaanAkun) => apiClient.post<{ id: number }>("/permintaan-akun", isi).then((r) => r.data);

export const getInfoAktivasi = (token: string) => apiClient.get<InfoAktivasi>("/aktivasi", { params: { token } }).then((r) => r.data);
export const aktifkanAkun = (token: string, password: string) => apiClient.post<{ email: string }>("/aktivasi", { token, password }).then((r) => r.data);

export const mintaResetSandi = (email: string) => apiClient.post<{ message: string }>("/lupa-sandi", { email }).then((r) => r.data);
export const getInfoReset = (token: string) => apiClient.get<InfoReset>("/reset-sandi", { params: { token } }).then((r) => r.data);
export const resetSandi = (token: string, password: string) => apiClient.post<{ email: string }>("/reset-sandi", { token, password }).then((r) => r.data);

export const konfirmasiEmail = (token: string) => apiClient.post<{ email: string }>("/konfirmasi-email", { token }).then((r) => r.data);
