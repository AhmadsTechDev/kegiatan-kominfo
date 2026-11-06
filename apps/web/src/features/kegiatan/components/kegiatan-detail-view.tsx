"use client";

import { ArrowLeft, Ban, Building2, CalendarDays, CircleAlert, CircleCheck, ImageOff, MapPin, MapPinOff, MessageSquareWarning, Pencil, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AvatarInisial } from "@/components/shared/avatar-inisial";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { MapPicker } from "@/components/shared/map-picker";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { StatusBadge, StatusPemeriksaanBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { formatAngka, formatJam, formatTanggal, formatTanggalJam } from "@/lib/format";
import { cn } from "@/lib/utils";
import { idValid, useKegiatan } from "../hooks/use-kegiatan";
import { DokumentasiGaleri } from "./dokumentasi-galeri";
import { KegiatanAksiDialog, type JenisAksi } from "./kegiatan-aksi-dialog";
import { KegiatanDetailSkeleton, KegiatanTidakDitemukan } from "./kegiatan-states";
import { PeriksaAksi } from "./periksa-aksi";

// Detail kegiatan: status, waktu, lokasi, hasil, dokumentasi, dan riwayat pemeriksaan

function Paragraf({ label, isi, kosong }: { label: string; isi: string | null; kosong: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm whitespace-pre-line", isi ? "text-foreground" : "text-muted-foreground")}>{isi ?? kosong}</dd>
    </div>
  );
}

function Fakta({ ikon: Ikon, label, children }: { ikon: typeof CalendarDays; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
        <Ikon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-semibold break-words">{children}</div>
      </div>
    </div>
  );
}

const jamSaja = (iso: string) => formatJam(iso).replace(" WIB", "");

export function KegiatanDetailView({ id }: { id: number }) {
  const router = useRouter();
  const { data: k, isPending, error, refetch, isRefetching } = useKegiatan(id);
  const [aksi, setAksi] = useState<JenisAksi | null>(null);
  const adaData = !!k;

  useEffect(() => {
    if (adaData && window.location.hash === "#dokumentasi") {
      document.getElementById("dokumentasi")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [adaData]);

  const kembali = (
    <Button asChild variant="outline" className="h-10">
      <Link href="/kegiatan">
        <ArrowLeft aria-hidden />
        Kembali
      </Link>
    </Button>
  );

  if (!idValid(id) || (error instanceof ApiError && error.status === 404)) {
    return (
      <>
        <PageHeader eyebrow="Kegiatan" title="Detail kegiatan" actions={kembali} />
        <KegiatanTidakDitemukan />
      </>
    );
  }
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} retrying={isRefetching} />;
  if (isPending) return <KegiatanDetailSkeleton />;

  const titik = k.lat != null && k.lng != null ? { lat: k.lat, lng: k.lng } : null;
  const satuHari = formatTanggal(k.tglMulai) === formatTanggal(k.tglSelesai);
  const kurangDok = k.dokumentasi.length === 0;
  const kurangHasil = !k.hasil?.trim();
  const perluLengkapi = k.bisaUbah && k.statusPelaksanaan === "selesai" && (kurangDok || kurangHasil);
  const adaPerbaikan = k.statusPemeriksaan === "perlu_perbaikan" && !!k.catatanPemeriksaan[0]?.isi;

  return (
    <>
      <PageHeader
        eyebrow={k.jenis.nama}
        title={k.judul}
        actions={
          <>
            {kembali}
            {k.bisaUbah && (
              <>
                {k.statusPelaksanaan === "berlangsung" && (
                  <Button variant="outline" className="h-10 pointer-coarse:min-h-11" onClick={() => setAksi("selesai")}>
                    <CircleCheck aria-hidden />
                    Selesaikan sekarang
                  </Button>
                )}
                <Button asChild className="h-10 pointer-coarse:min-h-11">
                  <Link href={`/kegiatan/${k.id}/ubah`}>
                    <Pencil aria-hidden />
                    Ubah kegiatan
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-10 text-destructive hover:text-destructive pointer-coarse:size-11"
                  aria-label="Hapus kegiatan"
                  title="Hapus kegiatan"
                  onClick={() => setAksi("hapus")}
                >
                  <Trash2 aria-hidden />
                </Button>
              </>
            )}
          </>
        }
      />

      <Panel className="gap-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={k.statusPelaksanaan} />
          <StatusPemeriksaanBadge status={k.statusPemeriksaan} />
          <span className="text-xs text-muted-foreground">
            Dicatat {formatTanggal(k.createdAt)} oleh {k.pembuat.nama}
          </span>
          {/* Tombol pemeriksaan (hanya pimpinan) di samping lencana statusnya, bukan kartu tersendiri */}
          {k.bisaPeriksa && <PeriksaAksi kegiatan={k} className="w-full sm:ml-auto sm:w-auto" />}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Fakta ikon={CalendarDays} label="Waktu">
            <span className="tabular-nums">
              {satuHari ? formatTanggal(k.tglMulai) : `${formatTanggal(k.tglMulai)}, ${jamSaja(k.tglMulai)}`}
              <span className="block text-xs font-normal text-muted-foreground">
                {satuHari ? `${jamSaja(k.tglMulai)}–${formatJam(k.tglSelesai)}` : `s.d. ${formatTanggal(k.tglSelesai)}, ${formatJam(k.tglSelesai)}`}
              </span>
            </span>
          </Fakta>
          <Fakta ikon={MapPin} label="Lokasi">
            {k.lokasiNama ?? <span className="font-normal text-muted-foreground">Belum diisi</span>}
          </Fakta>
          <Fakta ikon={Building2} label="Bidang">
            {k.bidang.nama}
            {k.unitInduk && <span className="block text-xs font-normal text-muted-foreground">{k.unitInduk.nama}</span>}
          </Fakta>
          <Fakta ikon={Users} label="Peserta">
            {k.jumlahPeserta == null ? <span className="font-normal text-muted-foreground">Belum diisi</span> : `${formatAngka(k.jumlahPeserta)} orang`}
          </Fakta>
        </div>
      </Panel>

      {/* Catatan perbaikan menggantikan pengingat "Kegiatan sudah selesai": satu kotak, satu tindakan */}
      {adaPerbaikan && (
        <div className="flex flex-col gap-3 rounded-xl border border-status-dibatalkan-foreground/20 bg-status-dibatalkan p-4 text-status-dibatalkan-foreground sm:flex-row sm:items-center">
          <MessageSquareWarning aria-hidden className="size-5 shrink-0" />
          <div className="min-w-0 flex-1 text-sm [overflow-wrap:anywhere]">
            <p className="font-semibold">Perlu perbaikan</p>
            <p className="whitespace-pre-line">{k.catatanPemeriksaan[0]!.isi}</p>
            <p className="mt-1 text-xs opacity-90">
              {k.catatanPemeriksaan[0]!.pemeriksa}, {formatTanggalJam(k.catatanPemeriksaan[0]!.waktu)}
            </p>
          </div>
          {k.bisaUbah && (
            <Button asChild size="sm" className="h-9 shrink-0 pointer-coarse:min-h-11">
              <Link href={`/kegiatan/${k.id}/ubah`}>
                <Pencil aria-hidden />
                Perbaiki
              </Link>
            </Button>
          )}
        </div>
      )}

      {k.dibatalkanAt && (
        <Alert>
          <Ban />
          <AlertTitle>Kegiatan dibatalkan pada {formatTanggalJam(k.dibatalkanAt)}</AlertTitle>
          <AlertDescription className="whitespace-pre-line">Alasan: {k.alasanBatal}</AlertDescription>
        </Alert>
      )}

      {perluLengkapi && !adaPerbaikan && (
        <div className="flex flex-col gap-3 rounded-xl border border-status-berlangsung-foreground/20 bg-status-berlangsung p-4 sm:flex-row sm:items-center">
          <CircleAlert aria-hidden className="size-5 shrink-0 text-status-berlangsung-foreground" />
          <div className="min-w-0 flex-1 text-sm text-status-berlangsung-foreground">
            <p className="font-semibold">Kegiatan sudah selesai</p>
            <p>Lengkapi {[kurangDok && "dokumentasi", kurangHasil && "hasil kegiatan"].filter(Boolean).join(" dan ")}.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild size="sm" className="h-9 pointer-coarse:min-h-11">
              <Link href={`/kegiatan/${k.id}/ubah`}>
                <Pencil aria-hidden />
                Lengkapi
              </Link>
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.8fr)] lg:gap-5">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel>
            <PanelHeader title="Uraian dan hasil" />
            <PanelBody>
              <dl className="grid gap-5">
                <Paragraf label="Uraian kegiatan" isi={k.uraian} kosong="Belum diisi." />
                <Paragraf
                  label="Hasil kegiatan"
                  isi={k.hasil}
                  kosong="Belum diisi."
                />
                {k.refEksternal && <Paragraf label="Nomor surat" isi={k.refEksternal} kosong="" />}
              </dl>
            </PanelBody>
          </Panel>

          <Panel id="dokumentasi" className="scroll-mt-24 lg:flex-1">
            <PanelHeader
              title="Dokumentasi"
              action={
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">{k.dokumentasi.length} berkas</span>
              }
            />
            <PanelBody className="flex flex-1 flex-col justify-center">
              {k.dokumentasi.length === 0 ? (
                <EmptyState icon={ImageOff} title="Belum ada dokumentasi." />
              ) : (
                <DokumentasiGaleri kegiatan={k} bacaSaja />
              )}
            </PanelBody>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel>
            <PanelHeader title="Lokasi" description={k.lokasiNama ?? undefined} />
            {titik ? (
              <MapPicker value={titik} onChange={() => {}} readOnly className="z-0 h-60 w-full" />
            ) : (
              <PanelBody>
                <EmptyState icon={MapPinOff} title="Titik lokasi belum diisi." />
              </PanelBody>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Penanggung jawab" />
            <PanelBody className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <AvatarInisial nama={k.penanggungJawab.nama} className="size-10 rounded-full" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">{k.penanggungJawab.nama}</span>
                  <span className="truncate text-xs text-muted-foreground">{k.bidang.nama}</span>
                </div>
              </div>
              {k.pengubahTerakhir && (
                <p className="border-t border-muted pt-3 text-xs text-muted-foreground">
                  Terakhir diubah {k.pengubahTerakhir.nama}, {formatTanggalJam(k.pengubahTerakhir.waktu)}
                </p>
              )}
            </PanelBody>
          </Panel>

          {k.catatanPemeriksaan.length > 0 && (
            <Panel>
              <PanelHeader title="Riwayat catatan perbaikan" />
              <PanelBody>
                <ol className="flex flex-col gap-3 text-sm">
                  {k.catatanPemeriksaan.map((c) => (
                    <li key={c.id} className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">
                        {c.pemeriksa}, {formatTanggalJam(c.waktu)}
                      </span>
                      {c.isi && <p className="whitespace-pre-line">{c.isi}</p>}
                    </li>
                  ))}
                </ol>
              </PanelBody>
            </Panel>
          )}

        </div>
      </div>

      <KegiatanAksiDialog target={aksi ? k : null} aksi={aksi} onClose={() => setAksi(null)} onDihapus={() => router.replace("/kegiatan")} />
    </>
  );
}
