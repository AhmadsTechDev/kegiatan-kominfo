import type { Db } from "@/lib/prisma";
import { NotFound, Unprocessable } from "@/lib/errors";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import type { AuditLogQuery, CatatAuditInput } from "@/types/audit-log.types";
import { AKSI_AUDIT } from "@/utils/konstanta";
import { awalHariJakarta } from "@/utils/periode";

const KUNCI_SENSITIF = /password|token|secret|cookie|authorization/i;

// Menyiapkan data untuk disimpan sebagai JSON: membuang kunci rahasia, mengubah Date/Decimal/BigInt jadi teks
export function redaksi(nilai: unknown): unknown {
  if (nilai === undefined || nilai === null) return null;
  if (typeof nilai === "bigint") return Number(nilai);
  if (nilai instanceof Date) return nilai.toISOString();
  if (Array.isArray(nilai)) return nilai.map(redaksi);
  if (typeof nilai === "object") {
    if (typeof (nilai as { toJSON?: unknown }).toJSON === "function") return (nilai as { toJSON(): unknown }).toJSON();
    return Object.fromEntries(
      Object.entries(nilai as Record<string, unknown>)
        .filter(([kunci]) => !KUNCI_SENSITIF.test(kunci))
        .map(([kunci, isi]) => [kunci, redaksi(isi)]),
    );
  }
  return nilai;
}

// Merapikan aktor: null bila tidak ada aktor, nama "Akun dihapus" bila akunnya sudah tidak ada
function rapikanAktor<T extends { aktor: { id: string | null; nama: string | null; email: string | null } }>(b: T) {
  return { ...b, aktor: b.aktor.id == null ? null : { id: b.aktor.id, nama: b.aktor.nama ?? "Akun dihapus", email: b.aktor.email } };
}

export const AuditLogService = {
  // Mencatat satu aksi ke audit log (append-only). Kirim `tx` agar ikut transaksi yang sedang berjalan
  async catat(input: CatatAuditInput, tx?: Db) {
    await AuditLogRepository.insert(
      {
        aktorId: input.aktorId,
        aksi: input.aksi,
        entitas: input.entitas,
        entitasId: input.entitasId == null ? null : String(input.entitasId),
        dataSebelum: redaksi(input.sebelum),
        dataSesudah: redaksi(input.sesudah),
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
      tx,
    );
  },

  // Daftar audit log untuk admin, dengan filter aktor/aksi/entitas/tanggal
  async daftar(query: AuditLogQuery) {
    if (query.dari && query.sampai && query.sampai < query.dari) {
      throw Unprocessable("Rentang tanggal tidak valid", [{ field: "sampai", message: "Tanggal akhir tidak boleh sebelum tanggal awal" }]);
    }
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const { items, total } = await AuditLogRepository.daftar(
      {
        aktorId: query.aktor,
        aksi: query.aksi,
        entitas: query.entitas?.trim() || undefined,
        dari: query.dari ? awalHariJakarta(query.dari) : undefined,
        sampai: query.sampai ? awalHariJakarta(query.sampai, 1) : undefined,
      },
      { page, pageSize },
    );
    return { items: items.map(rapikanAktor), total, page, pageSize };
  },

  // Detail satu catatan audit
  async detail(id: number) {
    const baris = await AuditLogRepository.detail(id);
    if (!baris) throw NotFound("Catatan audit tidak ditemukan");
    return rapikanAktor(baris);
  },

  // Pilihan untuk filter di halaman audit log: daftar aktor, entitas, dan aksi
  async pilihan() {
    const [aktor, entitas] = await Promise.all([AuditLogRepository.aktorTercatat(), AuditLogRepository.entitasTercatat()]);
    return { aktor, entitas, aksi: AKSI_AUDIT };
  },
};
