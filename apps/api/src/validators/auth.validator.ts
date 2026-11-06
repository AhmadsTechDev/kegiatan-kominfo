import { t } from "elysia";
import { TEMA } from "@/utils/konstanta";

const email = t.String({ format: "email", maxLength: 255, error: "Email tidak valid" });

/**
 * Panjang dan isi kata sandi diperiksa lengkap oleh utils/kebijakan-sandi.ts agar pesannya jelas
 */
const sandi = (pesan: string) => t.String({ minLength: 1, maxLength: 256, error: pesan });
const token = t.String({ minLength: 10, maxLength: 100, pattern: "^[A-Za-z0-9_-]+$", error: "Token tidak valid" });

/**
 * Aturan isian untuk akun sendiri (/me) dan alur tautan email tanpa login
 */
export const AuthValidator = {
  /**
   * Nama, NIP, dan bidang dikelola admin; pemilik akun hanya boleh mengubah kontak
   */
  ubahProfil: t.Object({
    kontak: t.Nullable(t.String({ maxLength: 50, pattern: "^[0-9+()\\-\\s]*$", error: "Kontak berupa nomor telepon, maksimal 50 karakter" })),
  }),
  unggahFoto: t.Object({ berkas: t.File({ error: "Pilih foto untuk diunggah" }) }),
  fotoParams: t.Object({ userId: t.String({ minLength: 1, maxLength: 36 }) }),

  gantiEmail: t.Object({ email, password: sandi("Kata sandi saat ini wajib diisi") }),
  gantiSandi: t.Object({
    sandiLama: sandi("Kata sandi saat ini wajib diisi"),
    sandiBaru: sandi("Kata sandi baru wajib diisi"),
    cabutSesiLain: t.Optional(t.Boolean()),
  }),
  sesiParams: t.Object({ id: t.String({ minLength: 1, maxLength: 36, error: "ID sesi tidak valid" }) }),

  /**
   * tema sengaja t.Union, bukan t.UnionEnum: t.Optional(t.UnionEnum) diisi otomatis nilai pertama ("light") bila tidak dikirim
   */
  preferensi: t.Object({
    tema: t.Optional(
      t.Union(
        TEMA.map((v) => t.Literal(v)),
        { error: "Tema harus light, dark, atau system" },
      ),
    ),
    notifPengingatKegiatan: t.Optional(t.Boolean({ error: "Nilai notifikasi harus true atau false" })),
    notifPengingatDokumentasi: t.Optional(t.Boolean({ error: "Nilai notifikasi harus true atau false" })),
  }),

  /**
   * Tanpa login
   */
  tokenQuery: t.Object({ token }),
  tokenBody: t.Object({ token }),
  aturSandi: t.Object({ token, password: sandi("Kata sandi wajib diisi") }),
  lupaSandi: t.Object({ email }),
};
