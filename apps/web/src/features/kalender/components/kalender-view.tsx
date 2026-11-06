"use client";

import { CalendarDays, CalendarX2, ChevronLeft, ChevronRight, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGrupNav } from "@/hooks/use-grup-nav";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useLingkupPegawai } from "@/features/auth/hooks/use-lingkup";
import { formatAngka, formatJam, formatPeriode } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useKalender } from "../use-kalender";
import type { DataKalender, KegiatanKalender } from "../types";

/**
 * Kalender bulanan kegiatan: penyaring bidang di atas kisi, agenda tanggal terpilih di samping
 */

const ZONA = "Asia/Jakarta";
const NAMA_HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/**
 * chart-1 (navy) milik "hari ini"; unit memakai chart-2 sampai chart-6
 */
const PALET_UNIT = [2, 3, 4, 5, 6];
const LAINNYA = -1;
const WARNA_LAINNYA = "var(--foreground)";
const MAKS_DI_SEL = 3;
const MAKS_AKAN_DATANG = 5;

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

const formatKunci = (kunci: string, opsi: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", ...opsi }).format(new Date(`${kunci}T12:00:00Z`));
const formatHariPanjang = (kunci: string) => formatKunci(kunci, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const jam = (nilai: string) => formatJam(nilai).slice(0, 5);

/**
 * Unit di luar palet digabung ke LAINNYA; kuncinya dipakai juga oleh penyaring bidang
 */
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
      title={`${hariPertama ? jam(k.tglMulai) : "Lanjutan"} · ${k.judul} · ${k.bidang.nama}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "flex min-w-0 items-start rounded-md px-1.5 py-1 text-xs leading-tight transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:hover:brightness-125",
        batal && "line-through opacity-70",
      )}
      style={{ backgroundColor: `color-mix(in oklab, ${warna} 18%, transparent)` }}
    >
      <span className="min-w-0">
        <span className="font-semibold tabular-nums">{hariPertama ? jam(k.tglMulai) : "Lanjutan"}</span>
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
  minggu,
  warnaUnit,
  onPilih,
}: {
  hari: string;
  kegiatan: KegiatanKalender[];
  diBulanIni: boolean;
  hariIni: boolean;
  terpilih: boolean;
  minggu: boolean;
  warnaUnit: (id: number) => string;
  onPilih: () => void;
}) {
  const sisa = kegiatan.length - MAKS_DI_SEL;

  /**
   * Seluruh sel bisa diketuk di layar sentuh; pengguna keyboard memakai tombol tanggal di dalamnya
   */
  return (
    <td
      onClick={onPilih}
      className={cn(
        "h-14 cursor-pointer border-t border-l border-muted p-1 align-top transition-colors first:border-l-0 md:h-32 md:p-1.5",
        !diBulanIni && "bg-muted/40",
        terpilih ? "bg-secondary/50 ring-2 ring-primary/60 ring-inset" : "hover:bg-muted/60",
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
          aria-current={hariIni ? "date" : undefined}
          aria-label={`${formatHariPanjang(hari)}, ${kegiatan.length} kegiatan`}
          className={cn(
            "flex size-7 cursor-pointer items-center justify-center self-start rounded-full text-xs font-semibold tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",

            /**
             * Minggu merah mengikuti kebiasaan kalender Indonesia
             */
            minggu && diBulanIni && !hariIni && "text-destructive",
            !diBulanIni && "font-normal text-muted-foreground",
            hariIni && "bg-primary text-primary-foreground",
          )}
        >
          {Number(hari.slice(8))}
        </button>
        {kegiatan.length > 0 && (
          <div className="flex flex-wrap gap-0.5 px-0.5 md:hidden" aria-hidden>
            {kegiatan.slice(0, 3).map((k) => (
              <span key={k.id} className="size-2 rounded-full" style={{ backgroundColor: warnaUnit(k.unitIndukId) }} />
            ))}
            {kegiatan.length > 3 && <span className="text-xs leading-none font-semibold text-muted-foreground">+</span>}
          </div>
        )}
        <div className="hidden min-w-0 flex-col gap-0.5 md:flex">
          {kegiatan.slice(0, MAKS_DI_SEL).map((k) => (
            <ChipKegiatan key={k.id} k={k} warna={warnaUnit(k.unitIndukId)} hari={hari} />
          ))}
          {sisa > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPilih();
              }}
              className="cursor-pointer self-start rounded px-1.5 text-xs font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              +{sisa} lagi
            </button>
          )}
        </div>
      </div>
    </td>
  );
}

/**
 * Satu kegiatan di agenda: kolom jam di kiri agar urutan waktu terbaca sekilas
 */
function ItemAgenda({ k, hari, warna, denganTanggal }: { k: KegiatanKalender; hari: string; warna: string; denganTanggal?: boolean }) {
  const mulai = kunciHari(k.tglMulai);
  const selesai = kunciHari(k.tglSelesai);
  const lanjutan = !denganTanggal && mulai < hari;
  return (
    <li>
      <Link
        href={`/kegiatan/${k.id}`}
        className="flex gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="flex w-12 shrink-0 flex-col tabular-nums">
          {denganTanggal ? (
            <>
              <span className="text-xs text-muted-foreground">{formatKunci(mulai, { weekday: "short" })}</span>
              <span className="font-heading text-lg leading-tight font-bold">{Number(mulai.slice(8))}</span>
            </>
          ) : (
            <>
              <span className="text-sm font-bold">{lanjutan ? "Lanjut" : jam(k.tglMulai)}</span>
              <span className="text-xs text-muted-foreground">{selesai === hari ? `s.d. ${jam(k.tglSelesai)}` : `s.d. ${formatKunci(selesai, { day: "numeric", month: "short" })}`}</span>
            </>
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-start justify-between gap-2">
            <span className={cn("text-sm font-semibold", k.statusPelaksanaan === "dibatalkan" && "line-through")}>{k.judul}</span>
            <StatusBadge status={k.statusPelaksanaan} className="shrink-0" />
          </span>
          {k.lokasiNama && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">{k.lokasiNama}</span>
            </span>
          )}
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            {/* Titik warna = penanda bidang yang sama dengan chip di kisi */}
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: warna }} />
            <span className="truncate">
              {k.bidang.nama} · {k.penanggungJawab}
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

function AgendaHari({
  hari,
  hariIni,
  kegiatan,
  akanDatang,
  warnaUnit,
}: {
  hari: string;
  hariIni: boolean;
  kegiatan: KegiatanKalender[];
  akanDatang: KegiatanKalender[];
  warnaUnit: (id: number) => string;
}) {
  return (
    <Panel>
      <div className="flex items-center gap-3 border-b border-muted px-4 py-4 md:px-5">
        <span
          aria-hidden
          className={cn(
            "flex size-14 shrink-0 flex-col items-center justify-center rounded-xl",
            hariIni ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
          )}
        >
          <span className="text-xs font-semibold">{formatKunci(hari, { month: "short" })}</span>
          <span className="font-heading text-2xl leading-none font-bold tabular-nums">{Number(hari.slice(8))}</span>
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-base font-bold">
            {formatKunci(hari, { weekday: "long" })}
            {hariIni && <span className="ml-2 text-xs font-semibold text-primary">Hari ini</span>}
          </h2>
          <p className="text-xs text-muted-foreground">
            {formatKunci(hari, { day: "numeric", month: "long", year: "numeric" })} · {kegiatan.length ? `${formatAngka(kegiatan.length)} kegiatan` : "tidak ada kegiatan"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 md:p-5">
        {kegiatan.length > 0 ? (
          <ul className="flex flex-col gap-2" aria-label={`Kegiatan ${formatHariPanjang(hari)}`}>
            {kegiatan.map((k) => (
              <ItemAgenda key={k.id} k={k} hari={hari} warna={warnaUnit(k.unitIndukId)} />
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
            <CalendarX2 aria-hidden className="size-4 shrink-0" />
            Tidak ada kegiatan pada tanggal ini.
          </p>
        )}

        {akanDatang.length > 0 && (
          <section aria-label="Akan datang bulan ini" className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-muted-foreground">Akan datang bulan ini</h3>
            <ul className="flex flex-col gap-2">
              {akanDatang.map((k) => (
                <ItemAgenda key={k.id} k={k} hari={hari} warna={warnaUnit(k.unitIndukId)} denganTanggal />
              ))}
            </ul>
          </section>
        )}
      </div>
    </Panel>
  );
}

type ButirBidang = { kunci: number; nama: string; warna: string; jumlah: number };

/**
 * Penyaring bidang tepat di atas kisi yang disaringnya; warnanya sekaligus keterangan warna chip di kisi
 */
function PenyaringBidang({ butir, total, dipilih, onPilih }: { butir: ButirBidang[]; total: number; dipilih: number | null; onPilih: (kunci: number | null) => void }) {
  const kelas = (aktif: boolean) =>
    cn(
      "inline-flex h-9 max-w-full cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11",
      aktif ? "border-primary/40 bg-secondary font-semibold text-secondary-foreground" : "bg-card text-foreground/80 hover:bg-muted",
    );
  return (
    <div role="group" aria-label="Saring kalender per bidang" className="flex flex-wrap gap-2 px-4 pb-3 md:px-5">
      {butir.length > 1 && (
        <button type="button" aria-pressed={dipilih === null} onClick={() => onPilih(null)} className={kelas(dipilih === null)}>
          Semua bidang
          <span className="tabular-nums text-muted-foreground">{formatAngka(total)}</span>
        </button>
      )}
      {butir.map((b) => {
        const aktif = dipilih === b.kunci;
        return (
          <button key={b.kunci} type="button" aria-pressed={aktif} title={b.nama} onClick={() => onPilih(aktif ? null : b.kunci)} className={kelas(aktif)}>
            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: b.warna }} />
            <span className="truncate sm:max-w-72">{b.nama}</span>
            <span className="tabular-nums text-muted-foreground">
              {formatAngka(b.jumlah)}
              <span className="sr-only"> kegiatan</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function KalenderView() {
  const { user } = useCurrentUser();
  const grupNav = useGrupNav("Operasional");
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

  const bidang = useMemo<ButirBidang[]>(() => {
    if (!data) return [];
    const jumlah = new Map<number, number>();
    for (const k of data.items) jumlah.set(kunciUnit(k.unitIndukId), (jumlah.get(kunciUnit(k.unitIndukId)) ?? 0) + 1);
    const unit = data.unitInduk
      .filter((u) => kunciUnit(u.id) === u.id && jumlah.has(u.id))
      .map((u) => ({ kunci: u.id, nama: u.nama, warna: warnaUnit(u.id), jumlah: jumlah.get(u.id)! }));
    return jumlah.has(LAINNYA) ? [...unit, { kunci: LAINNYA, nama: "Unit lainnya", warna: WARNA_LAINNYA, jumlah: jumlah.get(LAINNYA)! }] : unit;
  }, [data, kunciUnit, warnaUnit]);

  const keBulan = (kode: string | null) => {
    setPilihan(null);
    router.replace(kode ? `${pathname}?bulan=${kode}` : pathname, { scroll: false });
  };

  /**
   * Di ponsel panel agenda berada di bawah kisi; gulir ke sana bila belum terlihat agar ketukan tanggal ada hasilnya
   */
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
  const akanDatang = terpilih
    ? items.filter((k) => kunciHari(k.tglMulai) > terpilih && kunciHari(k.tglMulai).startsWith(bulan!)).slice(0, MAKS_AKAN_DATANG)
    : [];

  return (
    <>
      <PageHeader
        eyebrow={grupNav}
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

            {bidang.length > 0 && !isPending && <PenyaringBidang butir={bidang} total={data?.items.length ?? 0} dipilih={unitDipilih} onPilih={setUnitDipilih} />}

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
                <table aria-label={`Kalender ${formatPeriode(bulan!, true)}`} className="w-full table-fixed">
                  <thead>
                    <tr>
                      {NAMA_HARI.map((h, i) => (
                        <th
                          key={h}
                          scope="col"
                          className={cn("border-t border-l border-muted px-2 py-2 text-center text-xs font-semibold first:border-l-0", i === 6 ? "text-destructive" : "text-muted-foreground")}
                        >
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
                            minggu={i === 6}
                            warnaUnit={warnaUnit}
                            onPilih={() => pilihHari(hari)}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data?.terpotong && <p className="border-t border-muted px-4 py-3 text-xs text-status-berlangsung-foreground md:px-5">Terlalu banyak kegiatan; sebagian tidak ditampilkan.</p>}
              </div>
            )}
          </Panel>

          <div ref={agendaRef} className="scroll-mt-20 lg:sticky lg:top-6">
            {terpilih && !isPending ? (
              <AgendaHari hari={terpilih} hariIni={terpilih === hariIni} kegiatan={perHari.get(terpilih) ?? []} akanDatang={akanDatang} warnaUnit={warnaUnit} />
            ) : (
              <Skeleton className="h-64 rounded-xl" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
