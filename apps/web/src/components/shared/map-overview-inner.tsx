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
//   2. Titik kegiatan berupa pin per warna status; yang berdekatan dikelompokkan ke kluster berjumlah.
//   3. Hover pin: tooltip judul. Klik pin: popup judul, tanggal, lokasi, bidang, status.
//      Klik kluster: zoom ke kumpulannya. Popup otomatis berpindah sisi agar tetap di dalam peta.
//   4. Menyaring titik yang tampil sesuai status yang dipilih tanpa memuat ulang peta.
//   5. Menyesuaikan sudut kamera ke seluruh titik melalui tombol Semua Titik.
//
// Catatan penting:
//   - Popup informasi kegiatan dibangun melalui manipulasi DOM textContent (bukan
//     HTML mentah) untuk mencegah celah keamanan injeksi skrip (XSS) pada judul.
//   - Dibuka dalam tampak atas 2D; perspektif miring 3D bisa dipilih lewat tombol.
//   - Menggunakan koordinat format MapLibre GL [bujur, lintang] (lng, lat).
//
// Dipakai oleh: map-overview.tsx (dimuat secara dinamis tanpa SSR di peramban)
// =============================================================================

"use client";

import "maplibre-gl/dist/maplibre-gl.css";
// Diimpor eksplisit (bukan namespace global GeoJSON) agar editor dan tsc sama-sama menemukannya
import type { FeatureCollection, Point } from "geojson";
import { type GeoJSONSource, LngLatBounds, type LngLatBoundsLike, type Map as PetaGL, type MapLayerMouseEvent, Popup } from "maplibre-gl";
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
  lokasiNama?: string | null;
  bidang?: string;
};

const URUTAN: StatusPelaksanaan[] = ["akan_datang", "berlangsung", "selesai", "dibatalkan"];

// Pin berbentuk tetes per status, digambar di kanvas sekali lalu didaftarkan sebagai ikon peta.
// Ikon (bukan lingkaran) agar titik kegiatan berbeda dari POI basemap; warna = status pelaksanaan
function gambarPin(warna: string, tepi: string) {
  const r = 2;
  const w = 30 * r;
  const h = 40 * r;
  const kanvas = document.createElement("canvas");
  kanvas.width = w;
  kanvas.height = h;
  const c = kanvas.getContext("2d")!;
  const cx = w / 2;
  const cy = 14 * r;
  const rad = 11.5 * r;
  c.shadowColor = "rgba(0,0,0,0.35)";
  c.shadowBlur = 3 * r;
  c.shadowOffsetY = 1 * r;
  c.beginPath();
  c.arc(cx, cy, rad, Math.PI * 0.82, Math.PI * 2.18);
  c.lineTo(cx, h - 3 * r);
  c.closePath();
  c.fillStyle = warna;
  c.fill();
  c.shadowColor = "transparent";
  c.lineWidth = 2 * r;
  c.strokeStyle = tepi;
  c.stroke();
  c.beginPath();
  c.arc(cx, cy, 4.5 * r, 0, Math.PI * 2);
  c.fillStyle = tepi;
  c.fill();
  return { image: c.getImageData(0, 0, w, h), pixelRatio: r };
}


function keGeoJson(titik: TitikPeta[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: titik.map((t) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [t.lng, t.lat] },
      properties: {
        id: t.id,
        judul: t.judul,
        rentang: formatRentangTanggal(t.tglMulai, t.tglSelesai),
        status: t.statusPelaksanaan,
        lokasi: t.lokasiNama ?? "",
        bidang: t.bidang ?? "",
      },
    })),
  };
}

type PropsTitik = { id: number; judul: string; rentang: string; status: StatusPelaksanaan; lokasi: string; bidang: string };

// Baris keterangan berlabel di popup (lokasi, bidang); dilewati bila datanya kosong
function baris(label: string, nilai: string) {
  const p = document.createElement("p");
  p.className = "text-xs text-muted-foreground [overflow-wrap:anywhere]";
  const l = document.createElement("span");
  l.className = "font-medium text-foreground";
  l.textContent = `${label}: `;
  p.append(l, nilai);
  return p;
}

function isiPopup(p: PropsTitik, buka: (href: string) => void) {
  const akar = document.createElement("div");
  akar.className = "flex w-[min(16rem,calc(100vw-5rem))] flex-col gap-1.5 font-sans";
  const status = document.createElement("span");
  status.className = "inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium";
  status.style.background = `${WARNA_STATUS[p.status]}1f`;
  status.style.color = WARNA_STATUS[p.status];
  status.textContent = LABEL_STATUS[p.status];
  const judul = document.createElement("p");
  judul.className = "text-sm leading-snug font-semibold [overflow-wrap:anywhere]";
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
  akar.append(status, judul, waktu);
  if (p.lokasi) akar.append(baris("Lokasi", p.lokasi));
  if (p.bidang) akar.append(baris("Bidang", p.bidang));
  akar.append(tautan);
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
  // Tampak atas lebih mudah dibaca untuk sebaran titik; 3D tetap bisa dipilih
  const [tigaD, setTigaD] = useState(false);
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
    const popup = new Popup({ closeButton: true, maxWidth: "none", offset: [0, -34] });
    // Tooltip nama saat kursor di atas pin (hanya perangkat dengan kursor)
    const tooltip = new Popup({ closeButton: false, closeOnClick: false, maxWidth: "240px", offset: [0, -36], className: "peta-tooltip" });
    const pin = (s: StatusPelaksanaan) => `pin-${s}`;

    p.on("load", () => {
      tambahGedung3d(p, gelap);
      if (!terkini.current.tigaD) p.setLayoutProperty("gedung-3d", "visibility", "none");
      for (const s of URUTAN) if (!p.hasImage(pin(s))) {
        const g = gambarPin(WARNA_STATUS[s], gelap ? "#0b1220" : "#ffffff");
        p.addImage(pin(s), g.image, { pixelRatio: g.pixelRatio });
      }
      p.addSource("kegiatan", { type: "geojson", data: keGeoJson(terkini.current.titik), cluster: true, clusterRadius: 48, clusterMaxZoom: 15 });
      // Kluster: cincin luar transparan + inti, ukurannya naik bertahap sesuai jumlah kegiatan
      p.addLayer({
        id: "kluster-cincin",
        type: "circle",
        source: "kegiatan",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": gelap ? "#8fb0ff" : "#1a2a6e",
          "circle-opacity": 0.18,
          "circle-radius": ["step", ["get", "point_count"], 24, 5, 30, 15, 38],
        },
      });
      p.addLayer({
        id: "kluster",
        type: "circle",
        source: "kegiatan",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": gelap ? "#8fb0ff" : "#1a2a6e",
          "circle-opacity": 0.92,
          "circle-radius": ["step", ["get", "point_count"], 16, 5, 20, 15, 26],
          "circle-stroke-width": 2,
          "circle-stroke-color": gelap ? "#0b1220" : "#ffffff",
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
        id: "titik",
        type: "symbol",
        source: "kegiatan",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": ["concat", "pin-", ["get", "status"]],
          "icon-anchor": "bottom",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-pitch-alignment": "viewport",
        },
      });
      pasDenganTitik(false);
      setSiap(true);
    });

    p.on("click", "kluster", async (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const zoom = await (p.getSource("kegiatan") as GeoJSONSource).getClusterExpansionZoom(Number(f.properties.cluster_id));
      p.easeTo({ center: (f.geometry as Point).coordinates as [number, number], zoom, duration: geraknyaDikurangi() ? 0 : 600 });
    });
    p.on("click", "titik", (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const props = f.properties as PropsTitik;
      tooltip.remove();
      const titikPin = (f.geometry as Point).coordinates as [number, number];
      // Popup (~220 px di atas ujung pin) tidak boleh tertutup tombol 2D/3D di tepi atas: geser peta bila perlu
      const yPin = p.project(titikPin).y;
      const yAman = Math.min(290, p.getContainer().clientHeight - 40);
      if (yPin < yAman) p.panBy([0, yPin - yAman], { duration: geraknyaDikurangi() ? 0 : 400 });
      popup
        .setLngLat(titikPin)
        .setDOMContent(isiPopup(props, (href) => terkini.current.router.push(href)))
        .addTo(p);
    });
    for (const lapis of ["kluster", "titik"]) {
      p.on("mouseenter", lapis, () => (p.getCanvas().style.cursor = "pointer"));
      p.on("mouseleave", lapis, () => (p.getCanvas().style.cursor = ""));
    }
    if (!window.matchMedia("(pointer: coarse)").matches) {
      p.on("mousemove", "titik", (e: MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f || popup.isOpen()) return;
        tooltip.setLngLat((f.geometry as Point).coordinates as [number, number]).setText(String(f.properties.judul)).addTo(p);
      });
      p.on("mouseleave", "titik", () => tooltip.remove());
    }

    return () => {
      popup.remove();
      tooltip.remove();
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
