// =============================================================================
// TAMPILAN RINCIAN DETAIL KEGIATAN
// =============================================================================
// Gunanya: Menampilkan informasi lengkap satu kegiatan dinas meliputi status,
// waktu pelaksanaan, lokasi dan peta koordinat, uraian hasil, galeri dokumen,
// data penanggung jawab, riwayat pemeriksaan pimpinan, serta linimasa audit log.
//
// Isi berkas:
//   - Paragraf           : perender pasangan label dan teks deskripsi berbaris baru
//   - Fakta              : kartu ringkasan informasi berikon pada panel atas
//   - gabungRiwayat      : penggabung entri riwayat berkas berturut-turut (< 10 menit)
//   - Riwayat            : komponen linimasa riwayat aktivitas audit kegiatan
//   - KegiatanDetailView : komponen utama tampilan rincian detail kegiatan
//
// Cara kerja:
//   1. Mengambil data detail kegiatan dari server via hook useKegiatan(id).
//   2. Menampilkan kerangka skeleton saat memuat, atau pesan 404 jika tidak ada.
//   3. Menyajikan kartu fakta waktu, lokasi tempat, unit kerja, dan jumlah peserta.
//   4. Memunculkan pengingat melengkapi dokumen/hasil jika kegiatan sudah selesai.
//   5. Menampilkan panel pemeriksaan jika pengguna memiliki peran pimpinan.
//   6. Menyediakan menu ubah, aksi pembatalan, dan penghapusan bagi yang berhak.
//
// Catatan penting:
//   - Sesuai spesifikasi pemantauan pimpinan (features/06-pantau-pimpinan.md).
//   - Aksi unggah/hapus berkas berdekatan dipadatkan agar linimasa riwayat ringkas.
//   - Jangkar URL #dokumentasi otomatis digulir halus begitu data selesai dimuat.
//   - Tombol batalkan dan hapus dimasukkan ke menu dropdown demi mencegah salah klik.
//
// Dipakai oleh: app/(app)/kegiatan/[id]/page.tsx
// =============================================================================

"use client";

import { ArrowLeft, Ban, Building2, CalendarDays, CircleAlert, ImageOff, MapPin, MapPinOff, MessageSquareWarning, Pencil, Upload, Users } from "lucide-react";
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
import type { KegiatanDetail } from "../types";
import { DokumentasiGaleri } from "./dokumentasi-galeri";
import { KegiatanAksiDialog, type JenisAksi } from "./kegiatan-aksi-dialog";
import { KegiatanAksiMenu } from "./kegiatan-aksi-menu";
import { KegiatanDetailSkeleton, KegiatanTidakDitemukan } from "./kegiatan-states";
import { PeriksaAksi } from "./periksa-aksi";

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

const LABEL_RIWAYAT: Record<string, string> = {
  buat: "Kegiatan dibuat",
  ubah: "Informasi diperbarui",
  batal: "Kegiatan dibatalkan",
  unggah: "Dokumentasi diunggah",
  hapus_file: "Dokumentasi dihapus",
  ganti_file: "Dokumentasi diganti",
  periksa: "Diperiksa pimpinan",
};

type BarisRiwayat = { kunci: string; aksi: string; aktor: string; waktu: string; jumlah: number };

const JEDA_GABUNG_MS = 10 * 60 * 1000;

function gabungRiwayat(daftar: Omit<BarisRiwayat, "jumlah">[]): BarisRiwayat[] {
  const hasil: BarisRiwayat[] = [];
  for (const r of daftar) {
    const akhir = hasil.at(-1);
    if (
      akhir &&
      (r.aksi === "unggah" || r.aksi === "hapus_file") &&
      akhir.aksi === r.aksi &&
      akhir.aktor === r.aktor &&
      Math.abs(new Date(akhir.waktu).getTime() - new Date(r.waktu).getTime()) < JEDA_GABUNG_MS
    ) {
      akhir.jumlah++;
    } else {
      hasil.push({ ...r, jumlah: 1 });
    }
  }
  return hasil;
}

const BATAS_RIWAYAT = 5;

function Riwayat({ k }: { k: KegiatanDetail }) {
  const [semua, setSemua] = useState(false);
  const adaBuat = k.riwayat.some((r) => r.aksi === "buat");
  const daftar = gabungRiwayat([
    ...k.riwayat.map((r) => ({ kunci: String(r.id), aksi: r.aksi, aktor: r.aktor ?? "Sistem", waktu: r.waktu })),
    ...(adaBuat ? [] : [{ kunci: "buat", aksi: "buat", aktor: k.pembuat.nama, waktu: k.createdAt }]),
  ]);
  const tampil = semua || daftar.length <= BATAS_RIWAYAT + 1 ? daftar : [...daftar.slice(0, BATAS_RIWAYAT), daftar.at(-1)!];
  const tersembunyi = daftar.length - tampil.length;

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col">
        {tampil.map((r, i) => (
          <li key={r.kunci} className="relative grid grid-cols-[1rem_1fr] gap-3 pb-4 last:pb-0">
            {i < tampil.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-4 bottom-0 left-[0.4375rem] w-px",
                  tersembunyi > 0 && i === BATAS_RIWAYAT - 1 ? "border-l border-dashed border-border" : "bg-border",
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "mt-1 size-3.5 rounded-full border-3",
                r.aksi === "batal" || r.aksi === "hapus_file"
                  ? "border-status-dibatalkan bg-status-dibatalkan-foreground"
                  : r.aksi === "buat"
                    ? "border-secondary bg-primary"
                    : "border-status-selesai bg-status-selesai-foreground",
              )}
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-semibold">
                {LABEL_RIWAYAT[r.aksi] ?? r.aksi}
                {r.jumlah > 1 && <span className="font-normal text-muted-foreground">, {r.jumlah} berkas</span>}
              </span>
              <span className="text-xs text-muted-foreground">
                {r.aktor} · {formatTanggalJam(r.waktu)}
              </span>
            </div>
          </li>
        ))}
      </ol>
      {(tersembunyi > 0 || semua) && daftar.length > BATAS_RIWAYAT + 1 && (
        <Button variant="ghost" size="sm" className="h-9 w-fit px-2 text-primary" onClick={() => setSemua((v) => !v)}>
          {semua ? "Ringkas riwayat" : `Tampilkan ${tersembunyi} riwayat lainnya`}
        </Button>
      )}
    </div>
  );
}

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
  const keDokumentasi = () => document.getElementById("dokumentasi")?.scrollIntoView({ behavior: "smooth", block: "start" });

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
                <Button asChild className="h-10">
                  <Link href={`/kegiatan/${k.id}/ubah`}>
                    <Pencil aria-hidden />
                    Ubah
                  </Link>
                </Button>
                <KegiatanAksiMenu kegiatan={k} tanpaUbah onAksi={setAksi} />
              </>
            )}
          </>
        }
      />

      <Panel className="gap-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={k.statusPelaksanaan} />
          {k.statusPemeriksaan !== "terkirim" && <StatusPemeriksaanBadge status={k.statusPemeriksaan} />}
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
            {k.unitKerja.nama}
            {k.unitInduk && <span className="block text-xs font-normal text-muted-foreground">{k.unitInduk.nama}</span>}
          </Fakta>
          <Fakta ikon={Users} label="Peserta">
            {k.jumlahPeserta == null ? <span className="font-normal text-muted-foreground">Belum diisi</span> : `${formatAngka(k.jumlahPeserta)} orang`}
          </Fakta>
        </div>
      </Panel>

      {k.statusPemeriksaan === "perlu_perbaikan" && k.catatanPemeriksaan[0]?.isi && (
        <Alert className="border-status-dibatalkan-foreground/20 bg-status-dibatalkan text-status-dibatalkan-foreground">
          <MessageSquareWarning />
          <AlertTitle>
            Perlu perbaikan, dari {k.catatanPemeriksaan[0].pemeriksa} ({formatTanggalJam(k.catatanPemeriksaan[0].waktu)})
          </AlertTitle>
          <AlertDescription className="whitespace-pre-line text-status-dibatalkan-foreground">
            {k.catatanPemeriksaan[0].isi}
            {k.bisaUbah && " Ubah kegiatan ini setelah diperbaiki agar diperiksa ulang."}
          </AlertDescription>
        </Alert>
      )}

      {k.dibatalkanAt && (
        <Alert>
          <Ban />
          <AlertTitle>Kegiatan dibatalkan pada {formatTanggalJam(k.dibatalkanAt)}</AlertTitle>
          <AlertDescription className="whitespace-pre-line">Alasan: {k.alasanBatal}</AlertDescription>
        </Alert>
      )}

      {perluLengkapi && (
        <div className="flex flex-col gap-3 rounded-xl border border-status-berlangsung-foreground/20 bg-status-berlangsung p-4 sm:flex-row sm:items-center">
          <CircleAlert aria-hidden className="size-5 shrink-0 text-status-berlangsung-foreground" />
          <div className="min-w-0 flex-1 text-sm text-status-berlangsung-foreground">
            <p className="font-semibold">Kegiatan sudah selesai</p>
            <p>Lengkapi {[kurangDok && "dokumentasi", kurangHasil && "hasil kegiatan"].filter(Boolean).join(" dan ")}.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {kurangDok && (
              <Button size="sm" className="h-9" onClick={keDokumentasi}>
                <Upload aria-hidden />
                Unggah dokumentasi
              </Button>
            )}
            {kurangHasil && (
              <Button asChild size="sm" variant="outline" className="h-9 bg-card">
                <Link href={`/kegiatan/${k.id}/ubah`}>
                  <Pencil aria-hidden />
                  Isi hasil
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.8fr)] lg:gap-5">
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

          <Panel id="dokumentasi" className="scroll-mt-24">
            <PanelHeader
              title="Dokumentasi"
              action={
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">{k.dokumentasi.length} berkas</span>
              }
            />
            <PanelBody>
              {k.dokumentasi.length === 0 && !k.bisaUbah ? (
                <EmptyState icon={ImageOff} title="Belum ada dokumentasi." />
              ) : (
                <DokumentasiGaleri kegiatan={k} />
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
                  <span className="truncate text-xs text-muted-foreground">{k.unitKerja.nama}</span>
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
              <PanelHeader title="Riwayat pemeriksaan" />
              <PanelBody>
                <ol className="flex flex-col gap-3 text-sm">
                  {k.catatanPemeriksaan.map((c) => (
                    <li key={c.id} className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPemeriksaanBadge status={c.status} />
                        <span className="text-xs text-muted-foreground">
                          {c.pemeriksa}, {formatTanggalJam(c.waktu)}
                        </span>
                      </div>
                      {c.isi && <p className="whitespace-pre-line">{c.isi}</p>}
                    </li>
                  ))}
                </ol>
              </PanelBody>
            </Panel>
          )}

          <Panel>
            <PanelHeader title="Riwayat" />
            <PanelBody>
              <Riwayat k={k} />
            </PanelBody>
          </Panel>
        </div>
      </div>

      <KegiatanAksiDialog target={aksi ? k : null} aksi={aksi} onClose={() => setAksi(null)} onDihapus={() => router.replace("/kegiatan")} />
    </>
  );
}
