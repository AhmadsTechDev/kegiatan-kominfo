// =============================================================================
// KOMPONEN TAMPILAN KALENDER KEGIATAN
// =============================================================================
// Gunanya: Menampilkan visualisasi jadwal kegiatan dinas dalam bentuk kalender
// kisi bulanan interaktif beserta panel rincian agenda harian di sampingnya.
//
// Isi berkas:
//   - ChipKegiatan : Komponen representasi ringkas satu agenda di dalam sel tanggal.
//   - SelHari : Sel tanggal kalender (titik warna di ponsel, chip di desktop).
//   - AgendaHari : Panel perinci jadwal kegiatan pada tanggal yang dipilih.
//   - Legenda : Keterangan warna unit yang sekaligus menjadi penyaring.
//   - KalenderView : Komponen utama pengelola kisi kalender, navigasi, dan filter.
//
// Cara kerja:
//   1. Membaca parameter bulan aktif dari URL atau menetapkan bulan berjalan.
//   2. Mengambil data jadwal kegiatan bulanan menggunakan hook useKalender.
//   3. Menghitung susunan sel kalender mingguan (dimulai Senin) dalam zona WIB.
//   4. Mengelompokkan agenda ke tiap tanggal yang dilalui (termasuk kegiatan multihari).
//   5. Merender kisi kalender (tabel semantik) dengan warna pembeda per unit induk serta panel detail.
//
// Catatan penting:
//   - Warna pembeda menandai bidang induk (bidang/bagian) memakai chart-2 sampai chart-6;
//     chart-1 (navy) dipakai "hari ini" sehingga tidak dipakai unit. Unit ke-6 dan seterusnya
//     digabung sebagai "Unit lainnya" agar tidak ada dua unit berwarna sama.
//   - Warna bukan satu-satunya petunjuk: tiap chip memuat jam, dan panel agenda memuat nama unit.
//   - Maksimal 3 chip ditampilkan per sel pada desktop; selebihnya diringkas (+n lagi).
//   - Pada layar ponsel, sel tanggal hanya menampilkan indikator titik warna demi
//     keterbacaan; panel agenda berada tepat di bawah kisi dan digulir ke layar saat tanggal dipilih.
//   - Kisi memakai tabel biasa: satu tombol per tanggal, tanpa peran grid yang menjanjikan navigasi panah.
//   - Jika tanggal yang dipilih tidak memiliki kegiatan, panel secara otomatis
//     menampilkan agenda terdekat berikutnya di bulan yang sama.
//
// Dipakai oleh: app/(app)/kalender/page.tsx
// =============================================================================

"use client";

import { CalendarDays, CalendarX2, ChevronLeft, ChevronRight, Clock, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelHeader } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useLingkupPegawai } from "@/features/auth/hooks/use-lingkup";
import { formatAngka, formatJam, formatPeriode, formatRentangTanggal, formatTanggal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useKalender } from "../use-kalender";
import type { DataKalender, KegiatanKalender } from "../types";

const ZONA = "Asia/Jakarta";
const NAMA_HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
// chart-1 (navy) milik "hari ini"; unit memakai chart-2 sampai chart-6
const PALET_UNIT = [2, 3, 4, 5, 6];
const LAINNYA = -1;
const WARNA_LAINNYA = "var(--foreground)";
const MAKS_DI_SEL = 3;

const kunciHari = (nilai: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(nilai));

function geserHari(kunci: string, selisih: number) {
  const [t, b, h] = kunci.split("-").map(Number);
  return new Date(Date.UTC(t!, b! - 1, h! + selisih)).toISOString().slice(0, 10);
}

function geserBulan(kode: string, selisih: number) {
  const [t, b] = kode.split("-").map(Number);
  const indeks = t! * 12 + (b! - 1) + selisih;
  return `${Math.floor(indeks / 12)}-${String((indeks % 12) + 1).padStart(2, "0")}`;
}

function selBulan(kode: string) {
  const [t, b] = kode.split("-").map(Number);
  const pertama = new Date(Date.UTC(t!, b! - 1, 1));
  const jumlahHari = new Date(Date.UTC(t!, b!, 0)).getUTCDate();
  const geserAwal = (pertama.getUTCDay() + 6) % 7;
  const total = Math.ceil((geserAwal + jumlahHari) / 7) * 7;
  const awal = geserHari(`${kode}-01`, -geserAwal);
  return Array.from({ length: total }, (_, i) => geserHari(awal, i));
}

function kelompokkanPerHari(items: KegiatanKalender[]) {
  const peta = new Map<string, KegiatanKalender[]>();
  for (const k of items) {
    const akhir = kunciHari(k.tglSelesai);
    for (let hari = kunciHari(k.tglMulai), n = 0; hari <= akhir && n < 62; hari = geserHari(hari, 1), n++) {
      if (!peta.has(hari)) peta.set(hari, []);
      peta.get(hari)!.push(k);
    }
  }
  return peta;
}

const formatHariPanjang = (kunci: string) =>
  new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${kunci}T12:00:00Z`),
  );

// Unit di luar palet digabung ke LAINNYA; kuncinya dipakai juga oleh penyaring legenda
function useWarnaUnit(data: DataKalender | undefined) {
  return useMemo(() => {
    const peta = new Map<number, string>();
    data?.unitInduk.slice(0, PALET_UNIT.length).forEach((u, i) => peta.set(u.id, `var(--chart-${PALET_UNIT[i]})`));
    return {
      warna: (id: number) => peta.get(id) ?? WARNA_LAINNYA,
      kunci: (id: number) => (peta.has(id) ? id : LAINNYA),
    };
  }, [data]);
}

function ChipKegiatan({ k, warna, hari }: { k: KegiatanKalender; warna: string; hari: string }) {
  const batal = k.statusPelaksanaan === "dibatalkan";
  const hariPertama = kunciHari(k.tglMulai) === hari;
  return (
    <Link
      href={`/kegiatan/${k.id}`}
      title={`${hariPertama ? formatJam(k.tglMulai) : "Lanjutan"} · ${k.judul} · ${k.bidang.nama}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "flex min-w-0 items-start rounded-md px-1.5 py-1 text-xs leading-tight transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:hover:brightness-125",
        batal && "line-through",
      )}
      style={{ backgroundColor: `color-mix(in oklab, ${warna} 20%, transparent)` }}
    >
      <span className="min-w-0">
        <span className="font-semibold tabular-nums">{hariPertama ? formatJam(k.tglMulai).slice(0, 5) : "Lanjut"}</span>
        {batal && <span className="sr-only"> (dibatalkan)</span>} <span className="line-clamp-2 break-words">{k.judul}</span>
      </span>
    </Link>
  );
}

function SelHari({
  hari,
  kegiatan,
  diBulanIni,
  hariIni,
  terpilih,
  akhirPekan,
  warnaUnit,
  onPilih,
}: {
  hari: string;
  kegiatan: KegiatanKalender[];
  diBulanIni: boolean;
  hariIni: boolean;
  terpilih: boolean;
  akhirPekan: boolean;
  warnaUnit: (id: number) => string;
  onPilih: () => void;
}) {
  const sisa = kegiatan.length - MAKS_DI_SEL;
  // Seluruh sel bisa diketuk di layar sentuh; pengguna keyboard memakai tombol tanggal di dalamnya
  return (
    <td
      onClick={onPilih}
      className={cn(
        "h-16 cursor-pointer border-t border-l border-muted p-1 align-top transition-colors md:h-32 md:p-1.5",
        akhirPekan && "bg-muted/25",
        !diBulanIni && "bg-muted/50",
        terpilih ? "bg-secondary/60 ring-2 ring-primary/40 ring-inset" : "hover:bg-muted/50",
      )}
    >
      <div className="flex h-full flex-col gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPilih();
          }}
          aria-pressed={terpilih}
          aria-label={`${formatHariPanjang(hari)}, ${kegiatan.length} kegiatan`}
          className={cn(
            "flex size-7 cursor-pointer items-center justify-center self-start rounded-full text-xs font-semibold tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            !diBulanIni && "text-muted-foreground",
            hariIni && "bg-primary text-primary-foreground",
          )}
        >
          {Number(hari.slice(8))}
        </button>
        {kegiatan.length > 0 && (
          <div className="flex flex-wrap gap-0.5 px-0.5 md:hidden" aria-hidden>
            {kegiatan.slice(0, 4).map((k) => (
              <span key={k.id} className="size-2 rounded-full" style={{ backgroundColor: warnaUnit(k.unitIndukId) }} />
            ))}
          </div>
        )}
        <div className="hidden min-w-0 flex-col gap-0.5 md:flex">
          {kegiatan.slice(0, MAKS_DI_SEL).map((k) => (
            <ChipKegiatan key={k.id} k={k} warna={warnaUnit(k.unitIndukId)} hari={hari} />
          ))}
          {sisa > 0 && <span className="px-1.5 text-xs font-semibold text-primary">+{sisa} lagi</span>}
        </div>
      </div>
    </td>
  );
}

function AgendaHari({
  hari,
  kegiatan,
  berikutnya,
  warnaUnit,
}: {
  hari: string;
  kegiatan: KegiatanKalender[];
  berikutnya: KegiatanKalender[];
  warnaUnit: (id: number) => string;
}) {
  const daftar = kegiatan.length ? kegiatan : berikutnya;
  return (
    <Panel className="lg:sticky lg:top-6">
      <PanelHeader title={formatHariPanjang(hari)} description={kegiatan.length ? `${formatAngka(kegiatan.length)} kegiatan` : "Tidak ada kegiatan"} />
      {kegiatan.length === 0 && (
        <EmptyState icon={CalendarX2} title="Tidak ada kegiatan pada tanggal ini." className={berikutnya.length ? "pb-2" : "pb-6"} />
      )}
      {kegiatan.length === 0 && berikutnya.length > 0 && <p className="px-4 pb-2 text-xs font-semibold text-muted-foreground md:px-5">Berikutnya bulan ini</p>}
      {daftar.length > 0 && (
        <ul className="flex flex-col gap-2 px-4 pb-4 md:px-5">
          {daftar.map((k) => (
            <li key={k.id}>
              <Link
                href={`/kegiatan/${k.id}`}
                className="flex flex-col gap-1.5 rounded-lg border border-l-4 bg-card p-3 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                style={{ borderLeftColor: warnaUnit(k.unitIndukId) }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={cn("text-sm font-semibold", k.statusPelaksanaan === "dibatalkan" && "line-through")}>{k.judul}</span>
                  <StatusBadge status={k.statusPelaksanaan} className="shrink-0" />
                </div>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                  <Clock aria-hidden className="size-3.5" />
                  {kunciHari(k.tglMulai) === kunciHari(k.tglSelesai)
                    ? `${kegiatan.length ? "" : `${formatTanggal(k.tglMulai)} · `}${formatJam(k.tglMulai).slice(0, 5)}–${formatJam(k.tglSelesai)}`
                    : `${formatRentangTanggal(k.tglMulai, k.tglSelesai)} · mulai ${formatJam(k.tglMulai)}`}
                </span>
                {k.lokasiNama && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin aria-hidden className="size-3.5 shrink-0" />
                    <span className="truncate">{k.lokasiNama}</span>
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {k.jenis} · {k.bidang.nama} · {k.penanggungJawab}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

type ButirLegenda = { kunci: number; nama: string; warna: string };

// Keterangan warna unit; setiap butir juga tombol untuk menampilkan kegiatan unit itu saja
function Legenda({ butir, dipilih, onPilih }: { butir: ButirLegenda[]; dipilih: number | null; onPilih: (kunci: number | null) => void }) {
  return (
    <Panel className="px-4 py-3 md:px-5">
      <p className="mb-1.5 text-xs text-muted-foreground">Ketuk unit untuk menampilkan kegiatannya saja.</p>
      <ul aria-label="Keterangan warna unit" className="flex flex-col gap-x-3 gap-y-0.5 sm:flex-row sm:flex-wrap">
        {butir.map((b) => (
          <li key={b.kunci} className="min-w-0">
            <button
              type="button"
              aria-pressed={dipilih === b.kunci}
              title={b.nama}
              onClick={() => onPilih(dipilih === b.kunci ? null : b.kunci)}
              className={cn(
                "flex max-w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11",
                dipilih === b.kunci && "bg-secondary font-semibold text-secondary-foreground",
              )}
            >
              <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: b.warna }} />
              <span className="truncate sm:max-w-64">{b.nama}</span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function KalenderView() {
  const { user } = useCurrentUser();
  const { terbatas, unit: unitSaya } = useLingkupPegawai();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const paramBulan = searchParams.get("bulan");
  const bulanUrl = paramBulan && /^\d{4}-(0[1-9]|1[0-2])$/.test(paramBulan) ? paramBulan : null;
  const { data, isPending, isError, error, refetch, isRefetching, isPlaceholderData } = useKalender(bulanUrl);
  const [pilihan, setPilihan] = useState<string | null>(null);
  const [unitDipilih, setUnitDipilih] = useState<number | null>(null);
  const agendaRef = useRef<HTMLDivElement>(null);
  const { warna: warnaUnit, kunci: kunciUnit } = useWarnaUnit(data);

  const bulan = data?.bulan ?? bulanUrl;
  const sel = useMemo(() => (bulan ? selBulan(bulan) : []), [bulan]);
  const semua = data?.items;
  const items = useMemo(() => (unitDipilih === null ? (semua ?? []) : (semua ?? []).filter((k) => kunciUnit(k.unitIndukId) === unitDipilih)), [semua, unitDipilih, kunciUnit]);
  const perHari = useMemo(() => kelompokkanPerHari(items), [items]);
  const hariIni = kunciHari(new Date());
  const terpilih = pilihan && bulan && pilihan.startsWith(bulan) ? pilihan : bulan && hariIni.startsWith(bulan) ? hariIni : bulan ? `${bulan}-01` : null;

  const legenda = useMemo<ButirLegenda[]>(() => {
    if (!data) return [];
    const ada = new Set(data.items.map((k) => kunciUnit(k.unitIndukId)));
    const unit = data.unitInduk.filter((u) => kunciUnit(u.id) === u.id && ada.has(u.id)).map((u) => ({ kunci: u.id, nama: u.nama, warna: warnaUnit(u.id) }));
    return ada.has(LAINNYA) ? [...unit, { kunci: LAINNYA, nama: "Unit lainnya", warna: WARNA_LAINNYA }] : unit;
  }, [data, kunciUnit, warnaUnit]);

  const keBulan = (kode: string | null) => {
    setPilihan(null);
    router.replace(kode ? `${pathname}?bulan=${kode}` : pathname, { scroll: false });
  };

  // Di ponsel panel agenda berada di bawah kisi; gulir ke sana bila belum terlihat agar ketukan tanggal ada hasilnya
  const pilihHari = (hari: string) => {
    setPilihan(hari);
    const panel = agendaRef.current;
    if (panel && window.matchMedia("(max-width: 1023px)").matches && panel.getBoundingClientRect().top > window.innerHeight * 0.8) {
      const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      panel.scrollIntoView({ behavior: kurangiGerak ? "auto" : "smooth", block: "start" });
    }
  };

  const bisaMenambah = user?.role === "PEGAWAI";
  const bulanKosong = !!data && data.items.length === 0;

  return (
    <>
      <PageHeader
        eyebrow="Operasional"
        title="Kalender kegiatan"
        description={
          terbatas
            ? `Jadwal kegiatan ${unitSaya?.nama ?? "bidang Anda"} dan kegiatan yang Anda catat.`
            : "Jadwal kegiatan seluruh dinas per bulan. Warna menandai bidangnya."
        }
        actions={
          bisaMenambah && (
            <Button asChild className="h-10 pointer-coarse:min-h-11">
              <Link href="/kegiatan/baru">
                <Plus aria-hidden />
                Tambah kegiatan
              </Link>
            </Button>
          )
        }
      />

      {isError ? (
        <ErrorState message={error.message} onRetry={() => refetch()} retrying={isRefetching} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-5">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-9 pointer-coarse:size-11" aria-label="Bulan sebelumnya" disabled={!bulan} onClick={() => bulan && keBulan(geserBulan(bulan, -1))}>
                  <ChevronLeft />
                </Button>
                <h2 className="min-w-40 text-center font-heading text-lg font-bold" aria-live="polite">
                  {bulan ? formatPeriode(bulan, true) : <Skeleton className="mx-auto h-6 w-32" />}
                </h2>
                <Button variant="ghost" size="icon" className="size-9 pointer-coarse:size-11" aria-label="Bulan berikutnya" disabled={!bulan} onClick={() => bulan && keBulan(geserBulan(bulan, 1))}>
                  <ChevronRight />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {data && <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground tabular-nums">{formatAngka(items.length)} kegiatan</span>}
                <Button
                  variant="outline"
                  className="h-9 pointer-coarse:min-h-11"
                  disabled={!data || (data.bulan === data.bulanSekarang && terpilih === hariIni)}
                  onClick={() => {
                    if (data?.bulan !== data?.bulanSekarang) keBulan(null);
                    setPilihan(hariIni);
                  }}
                >
                  <CalendarDays aria-hidden />
                  Hari ini
                </Button>
              </div>
            </div>

            {bulanKosong && (
              <p className="px-4 pb-3 text-sm text-muted-foreground md:px-5">
                Belum ada kegiatan pada bulan ini.
                {bisaMenambah && (
                  <>
                    {" "}
                    <Link href="/kegiatan/baru" className="font-semibold text-primary hover:underline">
                      Tambah kegiatan
                    </Link>
                  </>
                )}
              </p>
            )}

            {isPending ? (
              <Skeleton className="mx-4 mb-4 h-128 rounded-xl md:mx-5" />
            ) : (
              <div className={cn("transition-opacity duration-150", isPlaceholderData && "opacity-60")}>
                <table aria-label={`Kalender ${formatPeriode(bulan!, true)}`} className="w-full table-fixed border-r border-b border-muted">
                  <thead>
                    <tr>
                      {NAMA_HARI.map((h) => (
                        <th key={h} scope="col" className="border-t border-l border-muted px-2 py-2 text-center text-xs font-semibold text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: sel.length / 7 }, (_, minggu) => (
                      <tr key={minggu}>
                        {sel.slice(minggu * 7, minggu * 7 + 7).map((hari, i) => (
                          <SelHari
                            key={hari}
                            hari={hari}
                            kegiatan={perHari.get(hari) ?? []}
                            diBulanIni={hari.startsWith(bulan!)}
                            hariIni={hari === hariIni}
                            terpilih={hari === terpilih}
                            akhirPekan={i >= 5}
                            warnaUnit={warnaUnit}
                            onPilih={() => pilihHari(hari)}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data?.terpotong && <p className="px-4 py-3 text-xs text-status-berlangsung-foreground md:px-5">Terlalu banyak kegiatan; sebagian tidak ditampilkan.</p>}
              </div>
            )}
          </Panel>

          <div ref={agendaRef} className="scroll-mt-20 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            {terpilih && !isPending ? (
              <AgendaHari
                hari={terpilih}
                kegiatan={perHari.get(terpilih) ?? []}
                berikutnya={items.filter((k) => kunciHari(k.tglMulai) > terpilih && kunciHari(k.tglMulai).startsWith(bulan!)).slice(0, 5)}
                warnaUnit={warnaUnit}
              />
            ) : (
              <Skeleton className="h-64 rounded-xl" />
            )}
          </div>

          {legenda.length > 0 && !isPending && <Legenda butir={legenda} dipilih={unitDipilih} onPilih={setUnitDipilih} />}
        </div>
      )}
    </>
  );
}
