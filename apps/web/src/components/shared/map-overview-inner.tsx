// =============================================================================
// IMPLEMENTASI INTERNAL PETA SEBARAN KEGIATAN
// =============================================================================
// Gunanya: Menampilkan visualisasi peta sebaran seluruh kegiatan pada peta vektor
//          MapLibre GL dengan pengelompokan titik kluster dan kartu popup info.
//
// Isi berkas:
//   - keGeoJson        : pengonversi daftar kegiatan ke GeoJSON FeatureCollection
//   - isiPopup         : pembuat elemen DOM popup detail kegiatan secara aman
//   - batasTitik       : penghitung kotak pembatas (bounding box) seluruh titik
//   - MapOverviewInner : komponen peta sebaran dengan kontrol kluster dan filter
//
// Cara kerja:
//   1. Menginisialisasi kanvas peta MapLibre GL dengan layer gedung 3D dan kluster.
//   2. Mengelompokkan titik-titik kegiatan yang berdekatan ke dalam lingkaran kluster.
//   3. Memperbesar tampilan saat kluster diklik, atau menampilkan popup saat titik diklik.
//   4. Menyaring titik yang tampil sesuai status yang dipilih tanpa memuat ulang peta.
//   5. Menyesuaikan sudut kamera ke seluruh titik melalui tombol Semua Titik.
//
// Catatan penting:
//   - Popup informasi kegiatan dibangun melalui manipulasi DOM textContent (bukan
//     HTML mentah) untuk mencegah celah keamanan injeksi skrip (XSS) pada judul.
//   - Mendukung peralihan perspektif miring 3D dan tampak atas 2D secara mulus.
//   - Menggunakan koordinat format MapLibre GL [bujur, lintang] (lng, lat).
//
// Dipakai oleh: map-overview.tsx (dimuat secara dinamis tanpa SSR di peramban)
// =============================================================================

"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { type GeoJSONSource, LngLatBounds, type LngLatBoundsLike, type ExpressionSpecification, type Map as PetaGL, type MapLayerMouseEvent, Popup } from "maplibre-gl";
import { Maximize } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatRentangTanggal } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  LABEL_STATUS,
  Tombol3d,
  WARNA_STATUS,
  aturMode3d,
  buatPeta,
  geraknyaDikurangi,
  tambahGedung3d,
  usePetaGelap,
} from "./peta-dasar";
import type { StatusPelaksanaan } from "./status-badge";

export type TitikPeta = {
  id: number;
  judul: string;
  lat: number;
  lng: number;
  tglMulai: string;
  tglSelesai: string;
  statusPelaksanaan: StatusPelaksanaan;
};

const URUTAN: StatusPelaksanaan[] = ["akan_datang", "berlangsung", "selesai", "dibatalkan"];

const WARNA_TITIK: ExpressionSpecification = [
  "match",
  ["get", "status"],
  "akan_datang",
  WARNA_STATUS.akan_datang,
  "berlangsung",
  WARNA_STATUS.berlangsung,
  "selesai",
  WARNA_STATUS.selesai,
  "dibatalkan",
  WARNA_STATUS.dibatalkan,
  "#64748b",
];

function keGeoJson(titik: TitikPeta[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: titik.map((t) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [t.lng, t.lat] },
      properties: { id: t.id, judul: t.judul, rentang: formatRentangTanggal(t.tglMulai, t.tglSelesai), status: t.statusPelaksanaan },
    })),
  };
}

function isiPopup(p: { id: number; judul: string; rentang: string; status: StatusPelaksanaan }, buka: (href: string) => void) {
  const akar = document.createElement("div");
  akar.className = "flex min-w-52 max-w-64 flex-col gap-1.5 font-sans";
  const status = document.createElement("span");
  status.className = "inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium";
  status.style.background = `${WARNA_STATUS[p.status]}1f`;
  status.style.color = WARNA_STATUS[p.status];
  status.textContent = LABEL_STATUS[p.status];
  const judul = document.createElement("p");
  judul.className = "text-sm leading-snug font-semibold";
  judul.textContent = p.judul;
  const waktu = document.createElement("p");
  waktu.className = "text-xs text-muted-foreground";
  waktu.textContent = p.rentang;
  const tautan = document.createElement("a");
  tautan.href = `/kegiatan/${Number(p.id)}`;
  tautan.className = "mt-1 text-xs font-semibold text-primary hover:underline";
  tautan.textContent = "Lihat detail →";
  tautan.addEventListener("click", (e) => {
    if (e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    buka(tautan.pathname);
  });
  akar.append(status, judul, waktu, tautan);
  return akar;
}

function batasTitik(titik: TitikPeta[]): LngLatBoundsLike | null {
  if (!titik.length) return null;
  const b = new LngLatBounds();
  for (const t of titik) b.extend([t.lng, t.lat]);
  return b;
}

export default function MapOverviewInner({ titik, className }: { titik: TitikPeta[]; className?: string }) {
  const router = useRouter();
  const wadah = useRef<HTMLDivElement>(null);
  const peta = useRef<PetaGL | null>(null);
  const gelap = usePetaGelap();
  const [tigaD, setTigaD] = useState(true);
  const [sembunyi, setSembunyi] = useState<StatusPelaksanaan[]>([]);
  const [siap, setSiap] = useState(false);

  const terkini = useRef({ titik, tigaD, router });
  useEffect(() => {
    terkini.current = { titik, tigaD, router };
  });

  const jumlah = useMemo(() => {
    const n: Record<StatusPelaksanaan, number> = { akan_datang: 0, berlangsung: 0, selesai: 0, dibatalkan: 0 };
    for (const t of titik) n[t.statusPelaksanaan]++;
    return n;
  }, [titik]);

  const pasDenganTitik = (animasi: boolean) => {
    const p = peta.current;
    const b = batasTitik(terkini.current.titik);
    if (!p || !b) return;
    p.fitBounds(b, {
      padding: { top: 56, bottom: 64, left: 40, right: 56 },
      maxZoom: 15,
      pitch: terkini.current.tigaD ? 50 : 0,
      bearing: terkini.current.tigaD ? -17 : 0,
      duration: animasi && !geraknyaDikurangi() ? 900 : 0,
    });
  };

  useEffect(() => {
    if (!wadah.current) return;
    const p = buatPeta(wadah.current, { gelap, pitch: terkini.current.tigaD ? 50 : 0, bearing: terkini.current.tigaD ? -17 : 0 });
    peta.current = p;
    const popup = new Popup({ closeButton: true, maxWidth: "280px", offset: 14 });

    p.on("load", () => {
      tambahGedung3d(p, gelap);
      if (!terkini.current.tigaD) p.setLayoutProperty("gedung-3d", "visibility", "none");
      p.addSource("kegiatan", { type: "geojson", data: keGeoJson(terkini.current.titik), cluster: true, clusterRadius: 44, clusterMaxZoom: 15 });
      p.addLayer({
        id: "kluster",
        type: "circle",
        source: "kegiatan",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": gelap ? "#8fb0ff" : "#1a2a6e",
          "circle-opacity": 0.92,
          "circle-radius": ["step", ["get", "point_count"], 16, 5, 20, 15, 26],
          "circle-stroke-width": 4,
          "circle-stroke-color": gelap ? "rgba(143,176,255,0.28)" : "rgba(26,42,110,0.22)",
        },
      });
      p.addLayer({
        id: "kluster-jumlah",
        type: "symbol",
        source: "kegiatan",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-allow-overlap": true },
        paint: { "text-color": gelap ? "#0b1220" : "#ffffff" },
      });
      p.addLayer({
        id: "titik-halo",
        type: "circle",
        source: "kegiatan",
        filter: ["!", ["has", "point_count"]],
        paint: { "circle-radius": 13, "circle-color": WARNA_TITIK, "circle-opacity": 0.2 },
      });
      p.addLayer({
        id: "titik",
        type: "circle",
        source: "kegiatan",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 7,
          "circle-color": WARNA_TITIK,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": gelap ? "#0b1220" : "#ffffff",
          "circle-pitch-alignment": "viewport",
        },
      });
      pasDenganTitik(false);
      setSiap(true);
    });

    p.on("click", "kluster", async (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const zoom = await (p.getSource("kegiatan") as GeoJSONSource).getClusterExpansionZoom(Number(f.properties.cluster_id));
      p.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom, duration: geraknyaDikurangi() ? 0 : 600 });
    });
    p.on("click", "titik", (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const props = f.properties as { id: number; judul: string; rentang: string; status: StatusPelaksanaan };
      popup
        .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
        .setDOMContent(isiPopup(props, (href) => terkini.current.router.push(href)))
        .addTo(p);
    });
    for (const lapis of ["kluster", "titik"]) {
      p.on("mouseenter", lapis, () => (p.getCanvas().style.cursor = "pointer"));
      p.on("mouseleave", lapis, () => (p.getCanvas().style.cursor = ""));
    }

    return () => {
      popup.remove();
      p.remove();
      peta.current = null;
      setSiap(false);
    };
  }, [gelap]);

  useEffect(() => {
    if (!siap || !peta.current) return;
    const tampil = titik.filter((t) => !sembunyi.includes(t.statusPelaksanaan));
    (peta.current.getSource("kegiatan") as GeoJSONSource | undefined)?.setData(keGeoJson(tampil));
  }, [titik, sembunyi, siap]);

  useEffect(() => {
    if (siap) pasDenganTitik(true);
  }, [titik, siap]);

  const ubah3d = (v: boolean) => {
    setTigaD(v);
    if (peta.current) aturMode3d(peta.current, v, { pitch: 50 });
  };

  const alihStatus = (s: StatusPelaksanaan) => setSembunyi((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]));

  return (
    <div className={cn("group/peta relative isolate overflow-hidden", className ?? "h-90 w-full rounded-xl")}>
      <div ref={wadah} className="h-full w-full" role="region" aria-label={`Peta sebaran ${titik.length} kegiatan`} />
      <p
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-12 z-10 mx-auto w-fit rounded-full bg-foreground/80 px-3 py-1.5 text-xs font-medium text-background opacity-0 transition-opacity duration-200 group-hover/peta:opacity-100 group-data-[zoom=aktif]/peta:opacity-0! pointer-coarse:hidden"
      >
        Klik atau geser peta untuk zoom dengan gulir mouse
      </p>
      <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-start gap-2">
        <Tombol3d aktif={tigaD} onUbah={ubah3d} className="pointer-events-auto" />
        <button
          type="button"
          onClick={() => pasDenganTitik(true)}
          className="pointer-events-auto flex h-8 items-center gap-1.5 rounded-lg border bg-card/95 px-2.5 text-xs font-medium shadow-sm backdrop-blur transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Maximize aria-hidden className="size-3.5" />
          <span className="hidden sm:inline">Semua titik</span>
          <span className="sr-only sm:hidden">Tampilkan semua titik</span>
        </button>
      </div>
      <div
        role="group"
        aria-label="Saring status di peta"
        className="absolute bottom-2 left-2 z-10 flex max-w-[calc(100%-5.5rem)] flex-wrap gap-1 rounded-lg border bg-card/95 p-1 shadow-sm backdrop-blur"
      >
        {URUTAN.filter((s) => jumlah[s] > 0).map((s) => {
          const aktif = !sembunyi.includes(s);
          return (
            <button
              key={s}
              type="button"
              aria-pressed={aktif}
              onClick={() => alihStatus(s)}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-[color,opacity] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                aktif ? "text-foreground" : "text-muted-foreground opacity-60 line-through",
              )}
            >
              <span aria-hidden className="size-2.5 rounded-full ring-2 ring-card" style={{ background: WARNA_STATUS[s] }} />
              {LABEL_STATUS[s]}
              <span className="text-muted-foreground tabular-nums">{jumlah[s]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
