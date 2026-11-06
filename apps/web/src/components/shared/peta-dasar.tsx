"use client";

import { FullscreenControl, Map as PetaGL, NavigationControl } from "maplibre-gl";
import { Box, Map as IkonPeta } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import type { StatusPelaksanaan } from "./status-badge";

/**
 * Konfigurasi dasar peta MapLibre wilayah Palembang: tema gelap, gestur, gedung 3D
 */

export const PUSAT_AWAL: [number, number] = [104.7754, -2.9761];
export const ZOOM_AWAL = 12;
export const KEMIRINGAN_3D = 55;

/**
 * Liberty (OpenFreeMap, data OpenStreetMap/OpenMapTiles): selain jalan dan wilayah, memuat lapisan POI
 * (fasilitas umum, sekolah, rumah sakit, ibadah, halte), nama kawasan, dan label sungai.
 * Positron yang dipakai sebelumnya tidak punya lapisan POI sehingga hanya nama jalan yang terlihat
 */
const GAYA = "https://tiles.openfreemap.org/styles/liberty";

const GELAP = {
  latar: "#0f1a2e",
  pemukiman: "#121e34",
  taman: "#10251f",
  air: "#0f2b4f",
  gedung: "#182540",
  gedungTepi: "#1f2e4d",
  jalanKecil: "#1f2c47",
  jalanBesar: "#2c3d60",
  jalanTol: "#3a4f7a",
  tepiJalan: "#0b1426",
  rel: "#2a3756",
  batas: "#3b4b6d",

  /**
   * Teks label minimal 4,5:1 terhadap latar #0f1a2e
   */
  label: "#b4c0d4",
  labelKota: "#e6ecf5",
  labelJalan: "#9aa8c2",
  labelAir: "#86a8dc",
  labelPoi: "#c9b98f",
  halo: "rgba(11,17,32,0.9)",
};

function warnaLapisGelap(id: string, jenis: string): Record<string, string | number> {
  if (jenis === "background") return { "background-color": GELAP.latar };
  if (jenis === "fill") {
    if (id === "water") return { "fill-color": GELAP.air };
    if (id.startsWith("landuse_") && id !== "landuse_residential") return { "fill-color": GELAP.taman, "fill-opacity": 0.5 };
    if (id === "park" || id.startsWith("landcover_wood")) return { "fill-color": GELAP.taman };
    if (id === "building") return { "fill-color": GELAP.gedung, "fill-outline-color": GELAP.gedungTepi };
    if (id.startsWith("aeroway") || id.startsWith("road_area")) return { "fill-color": GELAP.jalanKecil };
    return { "fill-color": GELAP.pemukiman };
  }
  if (jenis === "line") {
    if (id.startsWith("waterway")) return { "line-color": GELAP.air };
    if (id.includes("hatching")) return { "line-color": GELAP.rel };
    if (id.includes("path_pedestrian")) return { "line-color": GELAP.jalanKecil };
    if (id.includes("casing")) return { "line-color": GELAP.tepiJalan };
    if (id.includes("dashline")) return { "line-color": GELAP.latar };
    if (id.startsWith("railway")) return { "line-color": GELAP.rel };
    if (id.startsWith("boundary")) return { "line-color": GELAP.batas };
    if (id.includes("motorway")) return { "line-color": GELAP.jalanTol };
    if (id.includes("major")) return { "line-color": GELAP.jalanBesar };
    return { "line-color": GELAP.jalanKecil };
  }
  if (jenis === "raster") return { "raster-opacity": 0.15 };
  if (jenis === "symbol") {
    const warna = id.startsWith("poi") || id === "airport"
      ? GELAP.labelPoi
      : id.startsWith("water")
      ? GELAP.labelAir
      : id.startsWith("highway")
        ? GELAP.labelJalan
        : /^label_(city|town|village|country|state|other)/.test(id)
          ? GELAP.labelKota
          : GELAP.label;
    return { "text-color": warna, "text-halo-color": GELAP.halo };
  }
  return {};
}

export const WARNA_STATUS: Record<StatusPelaksanaan, string> = {
  akan_datang: "#0284c7",
  berlangsung: "#d97706",
  selesai: "#16a34a",
  dibatalkan: "#e11d48",
};

export const LABEL_STATUS: Record<StatusPelaksanaan, string> = {
  akan_datang: "Akan datang",
  berlangsung: "Berlangsung",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

const LOKAL: Record<string, string> = {
  "NavigationControl.ZoomIn": "Perbesar",
  "NavigationControl.ZoomOut": "Perkecil",
  "NavigationControl.ResetBearing": "Kembalikan arah ke utara",
  "FullscreenControl.Enter": "Layar penuh",
  "FullscreenControl.Exit": "Keluar dari layar penuh",
  "AttributionControl.ToggleAttribution": "Tampilkan atribusi",
  "CooperativeGesturesHandler.MobileHelpText": "Gunakan dua jari untuk menggeser peta",
};

export const layarSentuh = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

export const geraknyaDikurangi = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function usePetaGelap() {
  const { resolvedTheme } = useTheme();
  const kelasGelap = useSyncExternalStore(
    () => () => {},
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
  return resolvedTheme ? resolvedTheme === "dark" : kelasGelap;
}

function aktifkanGulirSaatDiklik(peta: PetaGL, wadah: HTMLElement) {
  const induk = wadah.parentElement;
  const atur = (aktif: boolean) => {
    if (aktif) peta.scrollZoom.enable();
    else peta.scrollZoom.disable();
    induk?.setAttribute("data-zoom", aktif ? "aktif" : "mati");
  };
  atur(false);
  peta.on("mousedown", () => atur(true));
  peta.getCanvasContainer().addEventListener("mouseleave", () => atur(false));
}

/**
 * Filter Liberty membandingkan angka (rank POI, ref_length) yang di sebagian ubin kosong, sehingga
 * MapLibre menulis "Expected value to be of type number, but found null" berulang di konsol.
 * Nilai kosong diganti 99: POI tanpa rank masuk kelompok prioritas terendah, perisai tanpa nomor tidak tampil
 */
const PEMBANDING = new Set(["<", "<=", ">", ">="]);
type Ekspresi = unknown;
function amankanFilter(f: Ekspresi): Ekspresi {
  if (!Array.isArray(f)) return f;
  if (PEMBANDING.has(f[0]))
    return [f[0], ...f.slice(1).map((a) => (Array.isArray(a) && a[0] === "get" && a.length === 2 ? ["coalesce", a, 99] : amankanFilter(a)))];
  return f.map(amankanFilter);
}

/**
 * Sprite OpenFreeMap tidak memuat semua ikon POI (office, atm, gate, ...); ikon yang hilang diganti
 * gambar transparan 1x1 agar labelnya tetap tampil tanpa peringatan di konsol
 */
const IKON_KOSONG = { width: 1, height: 1, data: new Uint8Array(4) };

type OpsiPeta = {
  gelap: boolean;
  pusat?: [number, number];
  zoom?: number;
  pitch?: number;
  bearing?: number;
  interaktif?: boolean;
};

export function buatPeta(
  wadah: HTMLElement,
  { gelap, pusat = PUSAT_AWAL, zoom = ZOOM_AWAL, pitch = 0, bearing = 0, interaktif = true }: OpsiPeta,
) {
  const peta = new PetaGL({
    container: wadah,
    style: GAYA,
    center: pusat,
    zoom,
    pitch,
    bearing,
    maxPitch: 70,
    interactive: interaktif,
    cooperativeGestures: layarSentuh(),
    attributionControl: { compact: true },
    locale: LOKAL,
  });
  peta.on("styleimagemissing", (e: { id: string }) => {
    if (!peta.hasImage(e.id)) peta.addImage(e.id, IKON_KOSONG);
  });
  peta.once("style.load", () => {
    /**
     * Ekstrusi gedung bawaan Liberty diganti lapisan gedung-3d sendiri (hanya tampil di mode 3D)
     */
    if (peta.getLayer("building-3d")) peta.setLayoutProperty("building-3d", "visibility", "none");
    for (const l of peta.getStyle().layers) {
      if (!("filter" in l) || !l.filter) continue;
      const aman = amankanFilter(l.filter);
      if (JSON.stringify(aman) !== JSON.stringify(l.filter)) peta.setFilter(l.id, aman as typeof l.filter);
    }
    if (!gelap) return;
    for (const l of peta.getStyle().layers) {
      /**
       * Pola isian (rawa, area jalan) tidak bisa diwarnai ulang; disembunyikan di tema gelap
       */
      if (l.type === "fill" && l.paint && "fill-pattern" in l.paint) {
        peta.setLayoutProperty(l.id, "visibility", "none");
        continue;
      }
      for (const [properti, nilai] of Object.entries(warnaLapisGelap(l.id, l.type))) peta.setPaintProperty(l.id, properti, nilai);
    }
  });
  if (!layarSentuh()) aktifkanGulirSaatDiklik(peta, wadah);
  peta.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
  peta.addControl(new FullscreenControl(), "top-right");
  peta.once("load", () => {
    if (wadah.clientWidth < 640) wadah.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
  });
  return peta;
}

export function tambahGedung3d(peta: PetaGL, gelap: boolean) {
  if (peta.getLayer("gedung-3d")) return;
  const labelPertama = peta.getStyle().layers.find((l) => l.type === "symbol")?.id;
  peta.addLayer(
    {
      id: "gedung-3d",
      type: "fill-extrusion",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      paint: {
        "fill-extrusion-color": gelap ? "#22304d" : "#d9dee8",
        "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 14, 0, 15, ["coalesce", ["get", "render_height"], 6]],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": 0.85,
      },
    },
    labelPertama,
  );
}

export function aturMode3d(peta: PetaGL, aktif: boolean, opsi: { pitch?: number; bearing?: number } = {}) {
  if (peta.getLayer("gedung-3d")) peta.setLayoutProperty("gedung-3d", "visibility", aktif ? "visible" : "none");
  peta.easeTo({
    pitch: aktif ? (opsi.pitch ?? KEMIRINGAN_3D) : 0,
    bearing: aktif ? (opsi.bearing ?? -17) : 0,
    duration: geraknyaDikurangi() ? 0 : 700,
  });
}

export function Tombol3d({ aktif, onUbah, className }: { aktif: boolean; onUbah: (v: boolean) => void; className?: string }) {
  return (
    <div role="group" aria-label="Tampilan peta" className={cn("flex rounded-lg border bg-card/95 p-0.5 text-xs font-medium shadow-sm backdrop-blur", className)}>
      {[
        { nilai: false, label: "2D", ikon: IkonPeta },
        { nilai: true, label: "3D", ikon: Box },
      ].map(({ nilai, label, ikon: Ikon }) => (
        <button
          key={label}
          type="button"
          aria-pressed={aktif === nilai}
          onClick={() => onUbah(nilai)}
          className={cn(
            "flex h-7 items-center gap-1 rounded-md px-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            aktif === nilai ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Ikon aria-hidden className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}