"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useProfil } from "@/features/auth/hooks/use-profil";
import { ApiError } from "@/lib/api-client";
import { idValid, useDraf, useKegiatan, useReferensi } from "../hooks/use-kegiatan";
import { KegiatanForm } from "./kegiatan-form";
import { KegiatanFormSkeleton, KegiatanTanpaAkses, KegiatanTidakDitemukan } from "./kegiatan-states";

/**
 * Pembungkus halaman tambah/ubah kegiatan, termasuk cek hak akses
 */

function TombolKembali({ href }: { href: string }) {
  return (
    <Button asChild variant="outline" className="h-10">
      <Link href={href}>
        <ArrowLeft aria-hidden />
        Kembali
      </Link>
    </Button>
  );
}

export function KegiatanBaruView({ drafId = null }: { drafId?: number | null }) {
  const { user } = useCurrentUser();
  const referensi = useReferensi();
  const profil = useProfil();
  const draf = useDraf(drafId);

  const header = (
    <PageHeader
      eyebrow="Kegiatan"
      title={drafId ? "Lanjutkan draf" : "Tambah kegiatan"}
      actions={<TombolKembali href="/kegiatan" />}
    />
  );

  /**
   * Hanya pegawai yang mencatat kegiatan; pimpinan dan admin melihat dan memeriksa (backend juga menolak 403)
   */
  if (user && user.role !== "PEGAWAI") {
    return (
      <>
        {header}
        <KegiatanTanpaAkses pesan="Kegiatan dicatat oleh pegawai. Pimpinan dan admin dapat melihat dan memeriksanya." />
      </>
    );
  }

  return (
    <>
      {header}
      {drafId != null && (!idValid(drafId) || (draf.error instanceof ApiError && draf.error.status === 404)) ? (
        <KegiatanTidakDitemukan judul="Draf tidak ditemukan." pesan="Draf mungkin sudah disimpan sebagai kegiatan atau dihapus." />
      ) : referensi.isError || draf.isError ? (
        <ErrorState
          message={(referensi.error ?? draf.error)!.message}
          onRetry={() => {
            referensi.refetch();
            if (draf.isError) draf.refetch();
          }}
        />
      ) : referensi.isPending || profil.isPending || (drafId != null && draf.isPending) ? (
        <KegiatanFormSkeleton />
      ) : !profil.data?.pegawai ? (
        <KegiatanTanpaAkses
          pesan="Akun Anda belum terhubung ke data pegawai, jadi belum dapat mencatat kegiatan. Hubungi administrator."
        />
      ) : (
        <KegiatanForm key={drafId ?? "baru"} referensi={referensi.data} penanggungJawabBawaan={profil.data.pegawai.id} draf={draf.data} />
      )}
    </>
  );
}

export function KegiatanUbahView({ id }: { id: number }) {
  const kegiatan = useKegiatan(id);
  const referensi = useReferensi();

  const header = (
    <PageHeader
      eyebrow="Kegiatan"
      title={kegiatan.data?.statusPelaksanaan === "selesai" ? "Hasil dan dokumentasi" : "Ubah kegiatan"}
      description={kegiatan.data?.judul}
      actions={<TombolKembali href={`/kegiatan/${id}`} />}
    />
  );

  if (!idValid(id) || (kegiatan.error instanceof ApiError && kegiatan.error.status === 404)) {
    return (
      <>
        {header}
        <KegiatanTidakDitemukan />
      </>
    );
  }

  const galat = kegiatan.error ?? referensi.error;
  return (
    <>
      {header}
      {galat ? (
        <ErrorState
          message={galat.message}
          onRetry={() => {
            kegiatan.refetch();
            referensi.refetch();
          }}
        />
      ) : !kegiatan.data || !referensi.data ? (
        <KegiatanFormSkeleton />
      ) : !kegiatan.data.bisaUbah ? (
        <KegiatanTanpaAkses pesan="Kegiatan hanya dapat diubah oleh pembuat, penanggung jawab, atau admin." />
      ) : (
        <KegiatanForm referensi={referensi.data} kegiatan={kegiatan.data} />
      )}
    </>
  );
}
