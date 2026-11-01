import { MasterService } from "@/services/master.service";
import { UndanganService } from "@/services/undangan.service";
import type { DaftarPegawaiQuery, ImporPegawai, IsiJenis, IsiJenisUnit, IsiPegawai, IsiPegawaiBaru, IsiUnit } from "@/types/master.types";
import type { Konteks } from "@/types/umum.types";
import { adminDari, aktorDari, requestMeta } from "@/utils/konteks";

type Id = { id: number };

export const MasterController = {
  // GET /api/admin/unit-kerja
  daftarUnit: () => MasterService.daftarUnit(),

  // POST /api/admin/unit-kerja
  buatUnit: ({ body, user, request, set }: Konteks<IsiUnit>) => {
    set.status = 201;
    return MasterService.buatUnit(body, aktorDari(user), requestMeta(request.headers));
  },

  // PATCH /api/admin/unit-kerja/:id
  ubahUnit: ({ params, body, user, request }: Konteks<IsiUnit, Id>) => MasterService.ubahUnit(params.id, body, aktorDari(user), requestMeta(request.headers)),

  // GET /api/admin/jenis-unit
  daftarJenisUnit: () => MasterService.daftarJenisUnit(),

  // POST /api/admin/jenis-unit
  buatJenisUnit: ({ body, user, request, set }: Konteks<IsiJenisUnit>) => {
    set.status = 201;
    return MasterService.buatJenisUnit(body, aktorDari(user), requestMeta(request.headers));
  },

  // PATCH /api/admin/jenis-unit/:id
  ubahJenisUnit: ({ params, body, user, request }: Konteks<IsiJenisUnit, Id>) =>
    MasterService.ubahJenisUnit(params.id, body, aktorDari(user), requestMeta(request.headers)),

  // GET /api/admin/pegawai
  daftarPegawai: ({ query }: Konteks<unknown, unknown, DaftarPegawaiQuery>) => MasterService.daftarPegawai(query),

  // POST /api/admin/pegawai — bila email diisi, langsung dikirimi undangan akun.
  // Gagal kirim undangan tidak membatalkan pegawai yang sudah tersimpan; galatnya dikembalikan di `undangan.galat`
  buatPegawai: async ({ body, user, request, set }: Konteks<IsiPegawaiBaru>) => {
    const { email: emailMentah, role, ...isi } = body;
    const email = emailMentah?.trim().toLowerCase() || null;
    const { id } = await MasterService.buatPegawai(isi, aktorDari(user), requestMeta(request.headers), email);
    set.status = 201;
    if (!email) return { id, undangan: null };
    try {
      const hasil = await UndanganService.undang({ pegawaiId: id, email, role: role ?? "PEGAWAI" }, adminDari(user, request));
      return { id, undangan: { email: hasil.email, galat: null } };
    } catch (e) {
      return { id, undangan: { email, galat: e instanceof Error ? e.message : "Undangan gagal dikirim" } };
    }
  },

  // PATCH /api/admin/pegawai/:id
  ubahPegawai: ({ params, body, user, request }: Konteks<IsiPegawai, Id>) =>
    MasterService.ubahPegawai(params.id, body, aktorDari(user), requestMeta(request.headers)),

  // GET /api/admin/pegawai/impor/templat — mengirim berkas Excel templat
  templatImporPegawai: async () =>
    new Response(await MasterService.templatImporPegawai(), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="templat-impor-pegawai.xlsx"',
        "Cache-Control": "no-store",
      },
    }),

  // POST /api/admin/pegawai/impor — simpan=1 menyimpan, selain itu hanya pratinjau
  imporPegawai: ({ body, user, request }: Konteks<ImporPegawai>) =>
    MasterService.imporPegawai(body.berkas, body.simpan === "1", aktorDari(user), requestMeta(request.headers)),

  // GET /api/admin/jenis-kegiatan
  daftarJenis: () => MasterService.daftarJenis(),

  // POST /api/admin/jenis-kegiatan
  buatJenis: ({ body, user, request, set }: Konteks<IsiJenis>) => {
    set.status = 201;
    return MasterService.buatJenis(body, aktorDari(user), requestMeta(request.headers));
  },

  // PATCH /api/admin/jenis-kegiatan/:id
  ubahJenis: ({ params, body, user, request }: Konteks<IsiJenis, Id>) => MasterService.ubahJenis(params.id, body, aktorDari(user), requestMeta(request.headers)),
};
