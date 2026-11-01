// =============================================================================
// API AKUN PUBLIK
// =============================================================================
// Gunanya: Menyediakan fungsi pemanggilan API publik terkait permohonan dan aktivasi akun.
//
// Isi berkas:
//   - ajukanPermintaanAkun : mengirim data permohonan akun baru ke endpoint /permintaan-akun
//   - getInfoAktivasi      : mengambil info pemilik undangan via token (410 jika tidak berlaku)
//   - aktifkanAkun         : menyetel kata sandi pertama kali via Better Auth resetPassword
//
// Dipakai oleh: MintaAkunForm, AktivasiForm
// =============================================================================

import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";

export type IsiPermintaanAkun = { nama: string; nip: string | null; email: string; catatan: string | null };
export type InfoAktivasi = { nama: string; email: string; kedaluwarsa: string };

export const ajukanPermintaanAkun = (isi: IsiPermintaanAkun) => apiClient.post<{ id: number }>("/permintaan-akun", isi).then((r) => r.data);

export const getInfoAktivasi = (token: string) => apiClient.get<InfoAktivasi>("/aktivasi", { params: { token } }).then((r) => r.data);

export async function aktifkanAkun(token: string, password: string) {
  const { error } = await authClient.resetPassword({ newPassword: password, token });
  if (error) throw new Error(error.code === "INVALID_TOKEN" ? "TOKEN" : error.code === "PASSWORD_TOO_SHORT" ? "PENDEK" : "UMUM");
}
