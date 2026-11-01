// =============================================================================
// MODUL FONDASI PETA VEKTOR MAPLIBRE GL
// =============================================================================
// Gunanya: Mengelola konfigurasi dasar peta vektor MapLibre GL untuk wilayah Kota
//          Palembang, penyesuaian tema gelap, gestur interaksi, dan gedung 3D.
//
// Isi berkas:
//   - PUSAT_AWAL, ZOOM_AWAL, KEMIRINGAN_3D : konstanta koordinat default Palembang
//   - WARNA_STATUS, LABEL_STATUS          : pemetaan visual status pelaksanaan
//   - usePetaGelap                        : hook pelacak tema gelap yang aman hidrasi
//   - buatPeta                            : pembangun instans peta MapLibre lengkap
//   - tambahGedung3d                      : penambah lapisan ekstrusi gedung 3D
//   - aturMode3d                          : pengatur animasi kamera antara 2D dan 3D
//   - Tombol3d                            : komponen tombol alih sudut pandang 2D/3D
//
// Cara kerja:
//   1. Menginisialisasi peta vektor OpenFreeMap dengan titik tengah Kota Palembang.
//   2. Mewarnai ulang layer peta secara dinamis jika aplikasi dalam mode gelap.
//   3. Mengamankan interaksi gulir mouse agar tidak mengganggu pengguliran halaman.
//   4. Menambahkan ekstrusi gedung 3D mulai zoom 14 di bawah layer label jalan.
//
// Catatan penting:
//   - Mengikuti panduan DESIGN.md bagian 6: gratis tanpa API key OpenFreeMap.
//   - Palet tema gelap disesuaikan dengan warna navy aplikasi agar nyaman dibaca.
//   - Pada perangkat sentuh, peta menggunakan gestur dua jari agar halaman tetap
//     dapat digulir normal dengan satu jari.
//
// Dipakai oleh: map-overview-inner.tsx dan map-picker-inner.tsx
// =============================================================================

"use client";

import { FullscreenControl, Map as PetaGL, NavigationControl } from "maplibre-gl";
import { Box, Map as IkonPeta } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import type { StatusPelaksanaan } from "./status-badge";

export const PUSAT_AWAL: [number, number] = [104.7754, -2.9761];
export const ZOOM_AWAL = 12;
export const KEMIRINGAN_3D = 55;

const GAYA = "https://tiles.openfreemap.org/styles/positron";

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
  label: "#a9b6cc",
  labelKota: "#dde5f2",
  labelJalan: "#8494b0",
  labelAir: "#7196d1",
  halo: "rgba(11,17,32,0.9)",
};

function warnaLapisGelap(id: string, jenis: string): Record<string, string | number> {
  if (jenis === "background") return { "background-color": GELAP.latar };
  if (jenis === "fill") {
    if (id === "water") return { "fill-color": GELAP.air };
    if (id === "park" || id.startsWith("landcover_wood")) return { "fill-color": GELAP.taman };
    if (id === "building") return { "fill-color": GELAP.gedung, "fill-outline-color": GELAP.gedungTepi };
    if (id.startsWith("aeroway") || id.startsWith("road_area")) return { "fill-color": GELAP.jalanKecil };
    return { "fill-color": GELAP.pemukiman };
  }
  if (jenis === "line") {
    if (id === "waterway") return { "line-color": GELAP.air };
    if (id.includes("casing")) return { "line-color": GELAP.tepiJalan };
    if (id.includes("dashline")) return { "line-color": GELAP.latar };
    if (id.startsWith("railway")) return { "line-color": GELAP.rel };
    if (id.startsWith("boundary")) return { "line-color": GELAP.batas };
    if (id.includes("motorway")) return { "line-color": GELAP.jalanTol };
    if (id.includes("major")) return { "line-color": GELAP.jalanBesar };
    return { "line-color": GELAP.jalanKecil };
  }
  if (jenis === "symbol") {
    const warna = id.startsWith("water")
      ? GELAP.labelAir
      : id.startsWith("highway")
        ? GELAP.labelJalan
        : /^label_(city|town|village|country|state)/.test(id)
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
  if (gelap) {
    peta.once("style.load", () => {
      for (const l of peta.getStyle().layers) {
        for (const [properti, nilai] of Object.entries(warnaLapisGelap(l.id, l.type))) peta.setPaintProperty(l.id, properti, nilai);
      }
    });
  }
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