import { t } from "elysia";

export const DokumentasiValidator = {
  params: t.Object({ id: t.Numeric({ minimum: 1, error: "ID dokumentasi tidak valid" }) }),
  kegiatanParams: t.Object({ id: t.Numeric({ minimum: 1, error: "ID kegiatan tidak valid" }) }),
  unggah: t.Object({ berkas: t.File({ error: "Pilih satu berkas untuk diunggah" }) }),
  unduhQuery: t.Object({
    unduh: t.Optional(t.Literal("1", { error: "Parameter unduh tidak valid" })),
    v: t.Optional(t.String({ maxLength: 40, error: "Parameter versi tidak valid" })),
  }),
};
