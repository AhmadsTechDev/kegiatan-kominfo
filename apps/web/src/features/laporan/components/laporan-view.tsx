"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FileText, Loader2, Printer } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { PilihCari, type OpsiCari } from "@/components/shared/pilih-cari";
import { RentangTanggalPicker } from "@/components/shared/rentang-tanggal-picker";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLingkupPegawai } from "@/features/auth/hooks/use-lingkup";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { idTab, PilihanTab } from "@/features/admin/components/admin-shared";
import { useGrupNav } from "@/hooks/use-grup-nav";
import { KegiatanTanpaAkses } from "@/features/kegiatan/components/kegiatan-states";
import { useReferensi } from "@/features/kegiatan/hooks/use-kegiatan";
import { useKegiatanFilter } from "@/features/kegiatan/hooks/use-kegiatan-filter";
import { useEkspor } from "@/features/rekap/hooks/use-rekap";
import type { FormatEkspor } from "@/features/rekap/types";
import { formatAngka, tanggalWib } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getDokumentasiLaporan, getEstimasi, getPratinjau } from "../api";
import type { CakupanLaporan } from "../types";
import { bagiHalaman, HalamanLaporan } from "./halaman-laporan";
import { hitungBerkas, LaporanDokumentasi } from "./laporan-dokumentasi";

// Halaman laporan: pilih cakupan, pratinjau, lalu unduh atau cetak

const SEMUA = "semua";
const ID_PANEL = "panel-isi-laporan";

type TabLaporan = "rekap" | "dokumentasi";

function unitDanTurunan(unit: { id: number; parentId: number | null }[], id: number) {
  const hasil = new Set([id]);
  for (let tambah = true; tambah; ) {
    tambah = false;
    for (const u of unit) {
      if (u.parentId != null && hasil.has(u.parentId) && !hasil.has(u.id)) {
        hasil.add(u.id);
        tambah = true;
      }
    }
  }
  return hasil;
}

// Rekap dan laporan hanya untuk pimpinan dan admin; backend juga menolak 403 untuk pegawai
export function LaporanView() {
  const { user } = useCurrentUser();
  if (user?.role === "PEGAWAI") {
    return (
      <>
        <PageHeader eyebrow="Kegiatan" title="Laporan" />
        <KegiatanTanpaAkses pesan="Halaman ini untuk pimpinan dan admin." />
      </>
    );
  }
  return <LaporanIsi />;
}

function LaporanIsi() {
  const grupNav = useGrupNav("Monitoring");
  const id = useId();
  const { filter, setFilter } = useKegiatanFilter();
  const { terbatas, saringUnit } = useLingkupPegawai();
  const referensi = useReferensi();
  const ekspor = useEkspor();
  const [tab, setTab] = useState<TabLaporan>("rekap");

  const cakupan = useMemo<CakupanLaporan>(() => {
    const hariIni = tanggalWib(new Date());
    const tanpaRentang = !filter.dari && !filter.sampai;
    return {
      dari: tanpaRentang ? `${hariIni.slice(0, 8)}01` : filter.dari,
      sampai: tanpaRentang ? hariIni : filter.sampai,
      unit: filter.unit,
      pegawai: filter.pegawai,
    };
  }, [filter.dari, filter.sampai, filter.unit, filter.pegawai]);

  const estimasi = useQuery({ queryKey: ["laporan", "estimasi", cakupan], queryFn: () => getEstimasi(cakupan), placeholderData: keepPreviousData });
  const pratinjau = useQuery({ queryKey: ["laporan", "pratinjau", cakupan], queryFn: () => getPratinjau(cakupan), placeholderData: keepPreviousData });

  // Dokumentasi baru diambil saat tabnya dibuka
  const dokumentasi = useQuery({
    queryKey: ["laporan", "dokumentasi", cakupan],
    queryFn: () => getDokumentasiLaporan(cakupan),
    placeholderData: keepPreviousData,
    enabled: tab === "dokumentasi",
  });

  const unitPilihan = saringUnit(referensi.data?.bidang ?? []);
  const unitBoleh = useMemo(() => new Set(unitPilihan.map((u) => u.id)), [unitPilihan]);
  const pegawaiPilihan = useMemo(() => {
    const semua = referensi.data?.pegawai ?? [];
    const dalamUnit = cakupan.unit ? unitDanTurunan(referensi.data?.bidang ?? [], Number(cakupan.unit)) : null;
    return semua.filter((p) => (dalamUnit ? dalamUnit.has(p.bidangId) : !terbatas || unitBoleh.has(p.bidangId)));
  }, [referensi.data, cakupan.unit, terbatas, unitBoleh]);
  const opsiPegawai = useMemo<OpsiCari[]>(() => {
    const namaUnit = new Map((referensi.data?.bidang ?? []).map((u) => [u.id, u.nama]));
    return pegawaiPilihan.map((p) => ({ nilai: String(p.id), label: p.nama, keterangan: namaUnit.get(p.bidangId) ?? "" }));
  }, [pegawaiPilihan, referensi.data]);

  const kosong = pratinjau.data?.baris.length === 0;
  const formatAktif = ekspor.isPending ? ekspor.variables?.format : undefined;
  const jumlahHalaman = pratinjau.data ? bagiHalaman(pratinjau.data.baris).length : 0;

  const unduh = (format: FormatEkspor) =>
    ekspor.mutate(
      { format, filter: { q: "", jenis: null, status: null, ...cakupan } },
      {
        onSuccess: ({ jumlah }) => toast.success(`Laporan PDF berisi ${formatAngka(jumlah)} kegiatan diunduh`),
        onError: (e) => toast.error(e.message),
      },
    );

  const cetak = () => {
    window.print();
    toast.success("Laporan dikirim ke dialog cetak");
  };

  const label = "text-xs font-bold text-foreground/80";

  return (
    <>
      <PageHeader
        eyebrow={grupNav}
        title="Cetak & unduh laporan"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-10" onClick={cetak} disabled={!pratinjau.data || pratinjau.isPlaceholderData}>
              <Printer aria-hidden />
              Cetak
            </Button>
            <Button className="h-10" onClick={() => unduh("pdf")} disabled={ekspor.isPending || !pratinjau.data || kosong}>
              {formatAktif === "pdf" ? <Loader2 aria-hidden className="animate-spin" /> : <FileText aria-hidden />}
              {formatAktif === "pdf" ? "Menyiapkan..." : "Unduh PDF"}
            </Button>
          </div>
        }
      />

      <Panel>
        <PanelHeader title="Rentang dan cakupan" description="Kosongkan bidang dan pegawai untuk mencakup semua kegiatan" />
        <PanelBody className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1.2fr)_1fr_1fr_auto]">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={`${id}-tanggal`} className={label}>
              Periode
            </label>
            <RentangTanggalPicker id={`${id}-tanggal`} value={cakupan} onChange={setFilter} bolehKosong={false} />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={`${id}-unit`} className={label}>
              Bidang
            </label>
            <Select value={cakupan.unit ?? SEMUA} onValueChange={(v) => setFilter({ unit: v === SEMUA ? null : v, pegawai: null })}>
              <SelectTrigger id={`${id}-unit`} className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEMUA}>{terbatas ? "Semua dalam lingkup saya" : "Semua bidang"}</SelectItem>
                {unitPilihan.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)} className={cn(u.parentId != null && "pl-6 text-muted-foreground")}>
                    {u.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={`${id}-pegawai`} className={label}>
              Pegawai
            </label>
            <PilihCari
              id={`${id}-pegawai`}
              value={cakupan.pegawai}
              onChange={(v) => setFilter({ pegawai: v })}
              opsi={opsiPegawai}
              labelSemua="Semua pegawai"
              placeholderCari="Ketik nama atau bidang..."
            />
          </div>
          <p className="text-sm sm:col-span-2 lg:col-span-1 lg:pb-2.5" aria-live="polite">
            {estimasi.data == null ? (
              <span className="text-muted-foreground">Menghitung...</span>
            ) : (
              <>
                <span className="font-heading text-lg font-extrabold tabular-nums">{formatAngka(estimasi.data)}</span>{" "}
                <span className="text-muted-foreground">kegiatan akan masuk laporan</span>
              </>
            )}
          </p>
        </PanelBody>
      </Panel>

      <Panel>
        <div className="border-b border-muted px-4 pt-4 pb-3 md:px-5">
          <PilihanTab
            label="Isi laporan"
            idPanel={ID_PANEL}
            value={tab}
            onChange={setTab}
            opsi={[
              { nilai: "rekap", label: "Rekap kegiatan" },
              { nilai: "dokumentasi", label: "Dokumentasi", jumlah: dokumentasi.data ? hitungBerkas(dokumentasi.data) : undefined },
            ]}
          />
        </div>
        <div role="tabpanel" id={ID_PANEL} aria-labelledby={idTab(ID_PANEL, tab)}>
          {tab === "rekap" ? (
            <>
              <PanelHeader title="Pratinjau" description={pratinjau.data ? `${jumlahHalaman} halaman · A4 mendatar` : undefined} />
              <PanelBody className="bg-muted/40">
                {pratinjau.isError ? (
                  <ErrorState message={pratinjau.error.message} onRetry={() => pratinjau.refetch()} retrying={pratinjau.isRefetching} />
                ) : !pratinjau.data ? (
                  <Skeleton className="mx-auto aspect-[297/210] w-full max-w-[1123px]" />
                ) : (
                  <SkalaPratinjau>
                    <HalamanLaporan data={pratinjau.data} className={cn("transition-opacity", pratinjau.isPlaceholderData && "opacity-60")} />
                  </SkalaPratinjau>
                )}
              </PanelBody>
            </>
          ) : (
            <PanelBody className="pt-4 md:pt-5">
              <LaporanDokumentasi
                cakupan={cakupan}
                data={dokumentasi.data}
                galat={dokumentasi.error}
                onUlang={() => dokumentasi.refetch()}
                mengulang={dokumentasi.isRefetching}
                memudar={dokumentasi.isPlaceholderData}
              />
            </PanelBody>
          )}
        </div>
      </Panel>

      {pratinjau.data &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="laporan-cetak" aria-hidden>
            <HalamanLaporan data={pratinjau.data} />
          </div>,
          document.body,
        )}
    </>
  );
}

// Lebar halaman A4 mendatar di layar (px). Di layar sempit halaman diperkecil
// utuh, bukan dilipat, agar susunannya tetap sama dengan hasil cetak.
const LEBAR_HALAMAN = 1123;

function SkalaPratinjau({ children }: { children: React.ReactNode }) {
  const luar = useRef<HTMLDivElement>(null);
  const dalam = useRef<HTMLDivElement>(null);
  const [ukuran, setUkuran] = useState({ skala: 1, tinggi: 0 });

  useEffect(() => {
    const l = luar.current;
    const d = dalam.current;
    if (!l || !d) return;
    const hitung = () => {
      const skala = Math.min(1, l.clientWidth / LEBAR_HALAMAN);
      setUkuran({ skala, tinggi: d.offsetHeight * skala });
    };
    const ro = new ResizeObserver(hitung);
    ro.observe(l);
    ro.observe(d);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={luar} className="overflow-hidden" style={{ height: ukuran.tinggi || undefined }}>
      <div
        ref={dalam}
        style={{
          width: LEBAR_HALAMAN,
          transform: `scale(${ukuran.skala})`,
          transformOrigin: "top left",
          marginInline: ukuran.skala === 1 ? "auto" : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
