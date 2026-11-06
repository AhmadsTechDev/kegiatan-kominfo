"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, CornerDownLeft, Plus, Search, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { navUntukRole } from "@/config/navigation";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { getDaftarKegiatan } from "@/features/kegiatan/api/kegiatan";
import type { KegiatanItem } from "@/features/kegiatan/types";
import { lepasLapisan } from "@/hooks/use-tutup-lewat-kembali";
import { formatRentangTanggal } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Pencarian cepat (command palette) untuk pindah halaman dan mencari kegiatan
 */

type Hasil =
  | { jenis: "halaman"; kunci: string; label: string; keterangan: string; href: string; icon: LucideIcon }
  | { jenis: "kegiatan"; kunci: string; kegiatan: KegiatanItem; href: string };

const JEDA_CARI_MS = 250;
const BATAS_KEGIATAN = 6;

/**
 * Debounce dalam bentuk hook: nilai baru baru "diteruskan" setelah tidak berubah selama `jeda` ms.
 * Teks yang diketik ditunda dulu sebelum dipakai sebagai query key, agar pencarian tidak dikirim di setiap huruf.
 */
function useTertunda(nilai: string, jeda: number) {
  const [tertunda, setTertunda] = useState(nilai);
  useEffect(() => {
    const t = setTimeout(() => setTertunda(nilai), jeda);
    return () => clearTimeout(t);
  }, [nilai, jeda]);
  return tertunda;
}

/**
 * Kotak pencarian cepat (Ctrl+K / Cmd+K) untuk mencari kegiatan dan menu.
 * Pintasan keyboard dipasang di window sekali saat komponen tampil, lalu dilepas saat komponen hilang.
 */
export function PencarianCepat() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [buka, setBuka] = useState(false);
  const [teks, setTeks] = useState("");
  const [aktif, setAktif] = useState(0);
  const idDaftar = useId();
  const daftarRef = useRef<HTMLUListElement>(null);
  const kata = useTertunda(teks.trim(), JEDA_CARI_MS);

  useEffect(() => {
    const tekan = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuka((v) => !v);
      }
    };
    window.addEventListener("keydown", tekan);
    return () => window.removeEventListener("keydown", tekan);
  }, []);

  const kegiatan = useQuery({
    queryKey: ["pencarian-cepat", kata],
    queryFn: () => getDaftarKegiatan({ q: kata, dari: null, sampai: null, unit: null, jenis: null, status: null, pegawai: null, milik: null, page: 1 }),
    enabled: buka && kata.length >= 2,
    staleTime: 30_000,
  });

  const cocok = (s: string) => s.toLowerCase().includes(teks.trim().toLowerCase());
  const halaman: Hasil[] = [
    ...(user?.role === "PEGAWAI"
      ? [{ jenis: "halaman" as const, kunci: "baru", label: "Tambah kegiatan", keterangan: "Aksi", href: "/kegiatan/baru", icon: Plus }]
      : []),
    ...navUntukRole(user?.role).flatMap((g) =>
      g.items.map((i) => ({ jenis: "halaman" as const, kunci: i.href, label: i.label, keterangan: g.label, href: i.href, icon: i.icon })),
    ),
  ].filter((h) => !teks.trim() || cocok(h.label) || cocok(h.keterangan));

  const hasilKegiatan: Hasil[] =
    kata.length >= 2
      ? (kegiatan.data?.items ?? []).slice(0, BATAS_KEGIATAN).map((k) => ({ jenis: "kegiatan", kunci: `k${k.id}`, kegiatan: k, href: `/kegiatan/${k.id}` }))
      : [];
  const semua = [...halaman, ...hasilKegiatan];
  const indeks = Math.min(aktif, Math.max(0, semua.length - 1));

  const tutup = () => {
    setBuka(false);
    setTeks("");
    setAktif(0);
  };

  /**
   * Entri riwayat milik dialog dilepas lalu diganti halaman tujuan. Tanpa ini, penutupan dialog
   * memanggil history.back() yang membatalkan perpindahan halaman
   */
  const pindahKe = (href: string) => {
    lepasLapisan();
    tutup();
    router.replace(href);
  };

  const pilih = (h: Hasil | undefined) => {
    if (h) pindahKe(h.href);
  };

  const geser = (arah: 1 | -1) => {
    if (semua.length === 0) return;
    const baru = (indeks + arah + semua.length) % semua.length;
    setAktif(baru);
    daftarRef.current?.querySelector(`[data-indeks="${baru}"]`)?.scrollIntoView({ block: "nearest" });
  };

  const baris = (h: Hasil, i: number) => {
    const terpilih = i === indeks;
    return (
      <li
        key={h.kunci}
        id={`${idDaftar}-${i}`}
        data-indeks={i}
        role="option"
        aria-selected={terpilih}
        onMouseMove={() => setAktif(i)}
        onClick={() => pilih(h)}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-75",
          terpilih ? "bg-secondary text-foreground" : "text-foreground/90",
        )}
      >
        {h.jenis === "halaman" ? (
          <>
            <span aria-hidden className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", terpilih ? "bg-card text-primary" : "bg-muted text-muted-foreground")}>
              <h.icon className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">{h.label}</span>
              <span className="text-xs text-muted-foreground">{h.keterangan}</span>
            </span>
          </>
        ) : (
          <>
            <span aria-hidden className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", terpilih ? "bg-card text-primary" : "bg-muted text-muted-foreground")}>
              <ClipboardList className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">{h.kegiatan.judul}</span>
              <span className="truncate text-xs text-muted-foreground">
                {formatRentangTanggal(h.kegiatan.tglMulai, h.kegiatan.tglSelesai)} · {h.kegiatan.bidang.nama}
              </span>
            </span>
            <StatusBadge status={h.kegiatan.statusPelaksanaan} className="hidden shrink-0 sm:inline-flex" />
          </>
        )}
        {terpilih && <CornerDownLeft aria-hidden className="size-4 shrink-0 text-muted-foreground" />}
      </li>
    );
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setBuka(true)}
        aria-label="Pencarian cepat (Ctrl+K)"
        className="h-10 gap-2.5 rounded-full border-border/80 bg-card/70 pr-2 pl-3.5 text-muted-foreground shadow-none hover:text-foreground max-sm:size-10 max-sm:p-0 sm:w-52 sm:justify-start lg:w-72"
      >
        <Search aria-hidden className="size-4 shrink-0" />
        <span className="hidden min-w-0 flex-1 truncate text-left text-sm font-normal sm:inline">Cari kegiatan atau menu</span>
        <kbd className="hidden h-6 items-center gap-0.5 rounded-full border bg-muted/60 px-2 font-sans text-[11px] font-medium text-muted-foreground lg:inline-flex">
          <span className="text-xs">Ctrl</span>
          <span>K</span>
        </kbd>
      </Button>

      <Dialog open={buka} onOpenChange={(v) => (v ? setBuka(true) : tutup())}>
        <DialogContent showCloseButton={false} className="top-[15%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogTitle className="sr-only">Pencarian cepat</DialogTitle>
          <DialogDescription className="sr-only">Cari halaman, aksi, atau kegiatan berdasarkan judul dan lokasi</DialogDescription>
          <div className="flex items-center gap-3 border-b px-4">
            <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={teks}
              onChange={(e) => {
                setTeks(e.target.value);
                setAktif(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  geser(1);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  geser(-1);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  pilih(semua[indeks]);
                }
              }}
              role="combobox"
              aria-expanded
              aria-controls={idDaftar}
              aria-activedescendant={semua.length ? `${idDaftar}-${indeks}` : undefined}
              aria-label="Kata kunci pencarian"
              placeholder="Cari kegiatan, lokasi, atau menu..."
              maxLength={100}
              className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {kegiatan.isFetching && <Spinner className="size-4 text-muted-foreground" />}
          </div>

          <ul ref={daftarRef} id={idDaftar} role="listbox" aria-label="Hasil pencarian" className="max-h-[min(60dvh,26rem)] overflow-y-auto p-2">
            {halaman.length > 0 && (
              <li role="presentation" className="px-3 pt-2 pb-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Menu dan aksi
              </li>
            )}
            {halaman.map((h, i) => baris(h, i))}
            {kata.length >= 2 && (
              <li role="presentation" className="px-3 pt-3 pb-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Kegiatan
              </li>
            )}
            {hasilKegiatan.map((h, i) => baris(h, halaman.length + i))}
            {kata.length >= 2 && !kegiatan.isFetching && hasilKegiatan.length === 0 && (
              <li role="presentation" className="px-3 py-3 text-sm text-muted-foreground">
                {kegiatan.isError ? "Pencarian kegiatan gagal. Coba lagi." : `Tidak ada kegiatan yang cocok dengan "${kata}".`}
              </li>
            )}
            {kata.length >= 2 && (kegiatan.data?.total ?? 0) > BATAS_KEGIATAN && (
              <li role="presentation" className="px-1 pt-1">
                <button
                  type="button"
                  onClick={() => pindahKe(`/kegiatan?q=${encodeURIComponent(kata)}`)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-secondary"
                >
                  Lihat semua {kegiatan.data?.total} hasil di daftar kegiatan
                  <ArrowRight aria-hidden className="size-4" />
                </button>
              </li>
            )}
          </ul>

          <div className="flex items-center gap-4 border-t bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
            <span>
              <kbd className="rounded border bg-card px-1 font-sans">↑</kbd> <kbd className="rounded border bg-card px-1 font-sans">↓</kbd> pilih
            </span>
            <span>
              <kbd className="rounded border bg-card px-1 font-sans">Enter</kbd> buka
            </span>
            <span>
              <kbd className="rounded border bg-card px-1 font-sans">Esc</kbd> tutup
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
