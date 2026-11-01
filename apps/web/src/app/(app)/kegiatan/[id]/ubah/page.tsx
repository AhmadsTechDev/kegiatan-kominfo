// =============================================================================
// HALAMAN PENGUBAHAN DATA KEGIATAN
// =============================================================================
// Gunanya: Menyediakan formulir pengeditan data kegiatan yang telah tersimpan
// berdasarkan parameter ID pada Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - metadata         : judul tab peramban untuk halaman ubah kegiatan
//   - Props            : tipe parameter rute dinamis Promise<{ id: string }>
//   - Isi              : fungsi asinkron pengurai ID untuk KegiatanUbahView
//   - KegiatanUbahPage : komponen utama berbalut Suspense dengan fallback skeleton
//
// Cara kerja:
//   1. Menunggu pemecahan Promise parameter URL untuk memperoleh ID kegiatan.
//   2. Mengubah ID menjadi tipe angka lalu memanggil komponen KegiatanUbahView.
//
// Dipakai oleh: Next.js App Router untuk rute /kegiatan/[id]/ubah
// =============================================================================

import type { Metadata } from "next";
import { Suspense } from "react";
import { KegiatanUbahView } from "@/features/kegiatan/components/kegiatan-form-view";
import { KegiatanFormSkeleton } from "@/features/kegiatan/components/kegiatan-states";

export const metadata: Metadata = { title: "Ubah kegiatan" };

type Props = { params: Promise<{ id: string }> };

async function Isi({ params }: Props) {
  const { id } = await params;
  return <KegiatanUbahView id={Number(id)} />;
}

export default function KegiatanUbahPage({ params }: Props) {
  return (
    <Suspense fallback={<KegiatanFormSkeleton />}>
      <Isi params={params} />
    </Suspense>
  );
}
