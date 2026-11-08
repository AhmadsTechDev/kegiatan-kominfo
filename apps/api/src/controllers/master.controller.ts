import { MasterService } from "@/services/master.service";
import { UndanganService } from "@/services/undangan.service";
import type { DaftarPegawaiQuery, IsiJenis, IsiPegawai, IsiPegawaiBaru, IsiUnit } from "@/types/master.types";
import type { Konteks } from "@/types/umum.types";

type Id = { id: number };

/**
 * Controller master data (pegawai, bidang, jenis kegiatan) untuk admin.
 * Setiap fungsi menerima konteks permintaan dari Elysia, mengambil bagian yang perlu, lalu menyerahkan pekerjaannya ke service.
 */
export const MasterController = {
  /**
   * GET /api/admin/bidang
   */
  daftarUnit: () => MasterService.daftarUnit(),

  /**
   * POST /api/admin/bidang
   */
  buatUnit: ({ body, set }: Konteks<IsiUnit>) => {
    set.status = 201;
    return MasterService.buatUnit(body);
  },

  /**
   * PATCH /api/admin/bidang/:id
   */
  ubahUnit: ({ params, body }: Konteks<IsiUnit, Id>) => MasterService.ubahUnit(params.id, body),

  /**
   * DELETE /api/admin/bidang/:id — hanya bila belum dipakai pegawai, kegiatan, atau sub bidang
   */
  hapusUnit: ({ params }: Konteks<unknown, Id>) => MasterService.hapusUnit(params.id),

  /**
   * DELETE /api/admin/pegawai/:id
   */
  hapusPegawai: ({ params }: Konteks<unknown, Id>) => MasterService.hapusPegawai(params.id),

  /**
   * GET /api/admin/pegawai
   */
  daftarPegawai: ({ query }: Konteks<unknown, unknown, DaftarPegawaiQuery>) => MasterService.daftarPegawai(query),

  /**
   * POST /api/admin/pegawai — bila email diisi, langsung dikirimi undangan akun.
   * Gagal kirim undangan tidak membatalkan pegawai yang sudah tersimpan; galatnya dikembalikan di `undangan.galat`
   */
  buatPegawai: async ({ body, set }: Konteks<IsiPegawaiBaru>) => {
    const { email: emailMentah, role, ...isi } = body;
    const email = emailMentah?.trim().toLowerCase() || null;
    const { id } = await MasterService.buatPegawai(isi, email);
    set.status = 201;
    if (!email) return { id, undangan: null };
    try {
      const hasil = await UndanganService.undang({ pegawaiId: id, email, role: role ?? "PEGAWAI" });
      return { id, undangan: { email: hasil.email, galat: null } };
    } catch (e) {
      return { id, undangan: { email, galat: e instanceof Error ? e.message : "Undangan gagal dikirim" } };
    }
  },

  /**
   * PATCH /api/admin/pegawai/:id
   */
  ubahPegawai: ({ params, body }: Konteks<IsiPegawai, Id>) =>
    MasterService.ubahPegawai(params.id, body),

  /**
   * GET /api/admin/jenis-kegiatan
   */
  daftarJenis: () => MasterService.daftarJenis(),

  /**
   * POST /api/admin/jenis-kegiatan
   */
  buatJenis: ({ body, set }: Konteks<IsiJenis>) => {
    set.status = 201;
    return MasterService.buatJenis(body);
  },

  /**
   * PATCH /api/admin/jenis-kegiatan/:id
   */
  ubahJenis: ({ params, body }: Konteks<IsiJenis, Id>) => MasterService.ubahJenis(params.id, body),
};
