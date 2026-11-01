// =============================================================================
// HALAMAN PEMBUATAN KEGIATAN BARU
// =============================================================================
// Gunanya: Menyediakan formulir pencatatan kegiatan dinas baru serta fasilitas
// melanjutkan draf yang tersimpan di Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - metadata         : judul tab peramban untuk halaman penambahan kegiatan
//   - Props            : tipe searchParams berformat Promise<{ draf?: string }>
//   - Isi              : fungsi asinkron pengurai query string draf untuk view formulir
//   - KegiatanBaruPage : komponen utama berbatas Suspense dengan fallback skeleton
//
// Catatan penting:
//   - Parameter draf opsional (?draf=ID) dibaca runtime untuk memuat draf tersimpan.
//
// Dipakai oleh: Next.js App Router untuk rute /kegiatan/baru
// =============================================================================

import type { Metadata } from "next";
import { Suspense } from "react";
import { KegiatanFormSkeleton } from "@/features/kegiatan/components/kegiatan-states";
import { KegiatanBaruView } from "@/features/kegiatan/components/kegiatan-form-view";

export const metadata: Metadata = { title: "Tambah kegiatan" };

type Props = { searchParams: Promise<{ draf?: string }> };

async function Isi({ searchParams }: Props) {
  const { draf } = await searchParams;
  return <KegiatanBaruView drafId={draf ? Number(draf) : null} />;
}

export default function KegiatanBaruPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<KegiatanFormSkeleton />}>
      <Isi searchParams={searchParams} />
    </Suspense>
  );
}
