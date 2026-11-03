// =============================================================================
// KOMPONEN GALERI DOKUMENTASI KEGIATAN
// =============================================================================
// Gunanya: Menampilkan, mengunggah, mengganti, melihat pratinjau, dan menghapus
// berkas bukti pelaksanaan kegiatan dinas berupa foto atau dokumen PDF.
//
// Isi berkas:
//   - adalahFoto        : fungsi helper pengecekan tipe MIME berkas gambar
//   - AksiBerkas        : bilah tombol aksi (unduh, ganti, hapus) per item berkas
//   - DokumentasiGaleri : komponen utama galeri grid berkas, dropzone, dan modal
//
// Cara kerja:
//   1. Berkas dokumentasi dipisahkan menjadi foto (grid thumbnail) dan PDF (kartu).
//   2. Pengguna berwenang dapat menambah berkas via dropzone yang langsung diunggah.
//   3. Mengklik thumbnail foto membuka modal pratinjau dengan navigasi antar-foto.
//   4. Berkas PDF dapat dibuka langsung di tab baru peramban via tautan terproteksi.
//   5. Penggantian berkas mempertahankan ID lama; penghapusan meminta konfirmasi dialog.
//
// Catatan penting:
//   - Mengikuti panduan antarmuka galeri dokumentasi (DESIGN.md bagian 5.5).
//   - Komponen Image Next.js memakai unoptimized karena gambar dilindungi otentikasi
//     kuki sesi peramban dan tidak dapat diakses langsung oleh pengoptimal server.
//   - Setiap berkas menyediakan tombol unduh sebagai fallback jika pratinjau gagal dibuka.
//   - Jika penggantian berkas gagal di jaringan, berkas lama tetap utuh di server.
//
// Dipakai oleh: components/kegiatan-detail-view.tsx, components/kegiatan-form.tsx
// =============================================================================

"use client";

import { ChevronLeft, ChevronRight, Download, ExternalLink, FileText, RefreshCw, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ACCEPT, FileDropzone } from "@/components/shared/file-dropzone";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatTanggalJam, formatUkuran } from "@/lib/format";
import { urlDokumentasi } from "../api/dokumentasi";
import { periksaBerkas, useAntreanUnggah, useGantiDokumentasi } from "../hooks/use-antrean-unggah";
import { useHapusDokumentasi } from "../hooks/use-kegiatan";
import type { Dokumentasi, KegiatanDetail } from "../types";

const adalahFoto = (d: Dokumentasi) => d.mime.startsWith("image/");

function AksiBerkas({
  d,
  bisaUbah,
  sedangDiganti,
  onGanti,
  onHapus,
}: {
  d: Dokumentasi;
  bisaUbah: boolean;
  sedangDiganti: boolean;
  onGanti: () => void;
  onHapus: () => void;
}) {
  const kelas = "h-8 flex-1 px-2 text-xs";
  return (
    <div className="mt-1.5 flex gap-1">
      <Button asChild variant="ghost" size="sm" className={kelas}>
        <a href={urlDokumentasi(d, true)} download aria-label={`Unduh ${d.namaAsli}`}>
          <Download aria-hidden className="size-3.5" />
          <span className="hidden sm:inline">Unduh</span>
        </a>
      </Button>
      {bisaUbah && (
        <>
          <Button type="button" variant="ghost" size="sm" className={kelas} onClick={onGanti} disabled={sedangDiganti} aria-label={`Ganti ${d.namaAsli}`}>
            {sedangDiganti ? <Spinner className="size-3.5" /> : <RefreshCw aria-hidden className="size-3.5" />}
            <span className="hidden sm:inline">Ganti</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`${kelas} text-destructive hover:text-destructive`}
            onClick={onHapus}
            disabled={sedangDiganti}
            aria-label={`Hapus ${d.namaAsli}`}
          >
            <Trash2 aria-hidden className="size-3.5" />
            <span className="hidden sm:inline">Hapus</span>
          </Button>
        </>
      )}
    </div>
  );
}

export type StatusAntrean = "kosong" | "menunggu" | "mengunggah";

// bacaSaja: hanya tampilan dan pratinjau (halaman detail); unggah, ganti, dan hapus ada di halaman ubah
// onAntreanBerubah: induk menahan tombol Simpan selama ada berkas yang belum diunggah atau sedang diunggah
export function DokumentasiGaleri({
  kegiatan,
  bacaSaja = false,
  onAntreanBerubah,
}: {
  kegiatan: Pick<KegiatanDetail, "id" | "dokumentasi" | "bisaUbah" | "statusPelaksanaan">;
  bacaSaja?: boolean;
  onAntreanBerubah?: (status: StatusAntrean) => void;
}) {
  const bisaUbah = kegiatan.bisaUbah && !bacaSaja;
  const antrean = useAntreanUnggah(kegiatan.dokumentasi.length);
  const statusAntrean: StatusAntrean = antrean.berjalan
    ? "mengunggah"
    : antrean.items.some((it) => it.status === "menunggu")
      ? "menunggu"
      : "kosong";
  useEffect(() => {
    onAntreanBerubah?.(statusAntrean);
  }, [statusAntrean, onAntreanBerubah]);
  const hapus = useHapusDokumentasi(kegiatan.id);
  const ganti = useGantiDokumentasi(kegiatan.id);
  const inputGanti = useRef<HTMLInputElement>(null);
  const [targetGanti, setTargetGanti] = useState<Dokumentasi | null>(null);
  const foto = kegiatan.dokumentasi.filter(adalahFoto);
  const [indeksPratinjau, setIndeksPratinjau] = useState<number | null>(null);
  const [akanDihapus, setAkanDihapus] = useState<Dokumentasi | null>(null);
  const dipratinjau = indeksPratinjau === null ? null : foto[indeksPratinjau];

  // Berkas yang dipilih masuk daftar dulu; baru diunggah setelah tombol Unggah ditekan
  const unggahAntrean = async () => {
    const { berhasil, gagal } = await antrean.unggah(kegiatan.id);
    if (berhasil > 0) toast.success(`${berhasil} berkas dokumentasi diunggah`);
    if (gagal === 0) antrean.bersihkanBerhasil();
  };

  const pilihGanti = (d: Dokumentasi) => {
    setTargetGanti(d);
    inputGanti.current?.click();
  };

  const kirimGanti = (d: Dokumentasi, berkas: File) => {
    const galat = periksaBerkas(berkas);
    if (galat) return toast.error(`"${berkas.name}" tidak dapat dipakai`, { description: galat });
    ganti.mutate(
      { id: d.id, berkas },
      {
        onSuccess: (baru) => {
          toast.success(`"${d.namaAsli}" diganti dengan "${baru.namaAsli}"`);
          setIndeksPratinjau(null);
        },
        onError: (e) =>
          toast.error(`Gagal mengganti "${d.namaAsli}"`, {
            description: e.message,
            action: { label: "Coba lagi", onClick: () => kirimGanti(d, berkas) },
          }),
      },
    );
  };
  const sedangDiganti = (d: Dokumentasi) => ganti.isPending && ganti.variables?.id === d.id;

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputGanti}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          const berkas = e.target.files?.[0];
          e.target.value = "";
          if (berkas && targetGanti) kirimGanti(targetGanti, berkas);
        }}
      />
      {kegiatan.dokumentasi.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Berkas dokumentasi">
          {kegiatan.dokumentasi.map((d) =>
            adalahFoto(d) ? (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setIndeksPratinjau(foto.indexOf(d))}
                  className="group relative block aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={`Lihat ${d.namaAsli}`}
                >
                  <Image
                    src={urlDokumentasi(d)}
                    alt={d.namaAsli}
                    fill
                    unoptimized
                    sizes="(min-width: 640px) 33vw, 50vw"
                    className="object-cover transition-transform duration-200 ease-out-expo group-hover:scale-105"
                  />
                </button>
                <AksiBerkas
                  d={d}
                  bisaUbah={bisaUbah}
                  sedangDiganti={sedangDiganti(d)}
                  onGanti={() => pilihGanti(d)}
                  onHapus={() => setAkanDihapus(d)}
                />
              </li>
            ) : (
              <li key={d.id}>
                <a
                  href={urlDokumentasi(d)}
                  target="_blank"
                  rel="noopener"
                  className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-lg border bg-background p-3 text-center transition-colors duration-120 ease-out hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <FileText aria-hidden className="size-8 text-primary" />
                  <span className="line-clamp-2 text-xs font-medium break-all">{d.namaAsli}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    PDF · {formatUkuran(d.ukuran)}
                    <ExternalLink aria-hidden className="size-3" />
                  </span>
                </a>
                <AksiBerkas
                  d={d}
                  bisaUbah={bisaUbah}
                  sedangDiganti={sedangDiganti(d)}
                  onGanti={() => pilihGanti(d)}
                  onHapus={() => setAkanDihapus(d)}
                />
              </li>
            ),
          )}
        </ul>
      )}

      {bisaUbah ? (
        <FileDropzone items={antrean.items} onTambah={antrean.tambah} onHapus={antrean.hapus} onUnggah={unggahAntrean} sisa={antrean.sisa} disabled={antrean.berjalan} />
      ) : (
        kegiatan.dokumentasi.length === 0 && (
          <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed bg-background px-4 py-8 text-center">
            <FileText aria-hidden className="size-6 text-muted-foreground" />
            <p className="text-sm font-semibold">Belum ada dokumentasi</p>
          </div>
        )
      )}

      <Dialog open={dipratinjau != null} onOpenChange={(v) => !v && setIndeksPratinjau(null)}>
        {dipratinjau && (
          <DialogContent className="gap-3 sm:max-w-3xl">
            <DialogTitle className="truncate pr-8">{dipratinjau.namaAsli}</DialogTitle>
            <DialogDescription>
              {formatUkuran(dipratinjau.ukuran)} · diunggah {formatTanggalJam(dipratinjau.createdAt)}
            </DialogDescription>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
              <Image src={urlDokumentasi(dipratinjau)} alt={dipratinjau.namaAsli} fill unoptimized sizes="768px" className="object-contain" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10"
                  aria-label="Foto sebelumnya"
                  disabled={indeksPratinjau === 0}
                  onClick={() => setIndeksPratinjau((i) => (i ?? 0) - 1)}
                >
                  <ChevronLeft />
                </Button>
                <span className="px-2 text-xs text-muted-foreground tabular-nums">
                  {(indeksPratinjau ?? 0) + 1} dari {foto.length}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10"
                  aria-label="Foto berikutnya"
                  disabled={indeksPratinjau === foto.length - 1}
                  onClick={() => setIndeksPratinjau((i) => (i ?? 0) + 1)}
                >
                  <ChevronRight />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="h-10">
                  <a href={urlDokumentasi(dipratinjau, true)} download>
                    <Download aria-hidden />
                    Unduh
                  </a>
                </Button>
                {bisaUbah && (
                  <>
                    <Button type="button" variant="outline" className="h-10" onClick={() => pilihGanti(dipratinjau)} disabled={sedangDiganti(dipratinjau)}>
                      {sedangDiganti(dipratinjau) ? <Spinner /> : <RefreshCw aria-hidden />}
                      Ganti
                    </Button>
                    <Button type="button" variant="destructive" className="h-10" onClick={() => setAkanDihapus(dipratinjau)}>
                      <Trash2 aria-hidden />
                      Hapus
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <ConfirmDialog
        open={akanDihapus != null}
        onOpenChange={(v) => !v && setAkanDihapus(null)}
        title="Hapus dokumentasi?"
        description={<span className="font-medium text-foreground">{akanDihapus?.namaAsli}</span>}
        confirmLabel="Hapus berkas"
        pendingLabel="Menghapus..."
        pending={hapus.isPending}
        onConfirm={() =>
          akanDihapus &&
          hapus.mutate(akanDihapus.id, {
            onSuccess: () => {
              toast.success("Dokumentasi dihapus");
              setAkanDihapus(null);
              setIndeksPratinjau(null);
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </div>
  );
}
