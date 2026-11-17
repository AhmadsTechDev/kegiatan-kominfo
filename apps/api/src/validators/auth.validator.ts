import { t } from "elysia";
import { TEMA } from "@/utils/konstanta";

const email = t.String({ format: "email", maxLength: 255, error: "Email tidak valid" });

const sandi = (pesan: string) => t.String({ minLength: 1, maxLength: 256, error: pesan });
const token = t.String({ minLength: 10, maxLength: 100, pattern: "^[A-Za-z0-9_-]+$", error: "Token tidak valid" });

export const AuthValidator = {
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

  tokenQuery: t.Object({ token }),
  tokenBody: t.Object({ token }),
  aturSandi: t.Object({ token, password: sandi("Kata sandi wajib diisi") }),
  lupaSandi: t.Object({ email }),
};

export type UbahProfil = typeof AuthValidator.ubahProfil.static;
export type GantiEmail = typeof AuthValidator.gantiEmail.static;
export type GantiSandi = typeof AuthValidator.gantiSandi.static;
export type UbahPreferensi = typeof AuthValidator.preferensi.static;
export type AturSandi = typeof AuthValidator.aturSandi.static;
export type Preferensi = Required<UbahPreferensi>;
