"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { type Map as PetaGL, type MapMouseEvent, Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  KEMIRINGAN_3D,
  Tombol3d,
  ZOOM_AWAL,
  aturMode3d,
  buatPeta,
  geraknyaDikurangi,
  tambahGedung3d,
  usePetaGelap,
} from "./peta-dasar";

// Peta untuk memilih atau menampilkan satu titik lokasi kegiatan (MapLibre, gedung 3D)

export type Koordinat = { lat: number; lng: number };

const ZOOM_TITIK = 16;

const bulatkan = (n: number) => Math.round(n * 1e6) / 1e6;

function elemenPin(bisaGeser: boolean) {
  const el = document.createElement("div");
  el.className = cn("flex flex-col items-center", bisaGeser && "cursor-grab active:cursor-grabbing");
  el.innerHTML = `
    <svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true" class="drop-shadow-md">
      <path d="M17 1C8.2 1 1 8 1 16.7 1 28.4 17 43 17 43s16-14.6 16-26.3C33 8 25.8 1 17 1Z" fill="var(--primary)" stroke="var(--card)" stroke-width="2"/>
      <circle cx="17" cy="16.5" r="5.5" fill="var(--card)"/>
    </svg>`;
  return el;
}

type Props = { value: Koordinat | null; onChange: (k: Koordinat) => void; readOnly?: boolean; className?: string };

export default function MapPickerInner({ value, onChange, readOnly, className }: Props) {
  const wadah = useRef<HTMLDivElement>(null);
  const peta = useRef<PetaGL | null>(null);
  const penanda = useRef<Marker | null>(null);
  const gelap = usePetaGelap();
  const [tigaD, setTigaD] = useState(!!readOnly);

  const terkini = useRef({ value, onChange, tigaD });
  useEffect(() => {
    terkini.current = { value, onChange, tigaD };
  });

  const pasangPenanda = (p: PetaGL, k: Koordinat) => {
    if (penanda.current) {
      penanda.current.setLngLat([k.lng, k.lat]);
      return;
    }
    const m = new Marker({ element: elemenPin(!readOnly), anchor: "bottom", draggable: !readOnly, pitchAlignment: "viewport" })
      .setLngLat([k.lng, k.lat])
      .addTo(p);
    m.on("dragend", () => {
      const ll = m.getLngLat();
      terkini.current.onChange({ lat: bulatkan(ll.lat), lng: bulatkan(ll.lng) });
    });
    penanda.current = m;
  };

  useEffect(() => {
    if (!wadah.current) return;
    const awal = terkini.current.value;
    const p = buatPeta(wadah.current, {
      gelap,
      pusat: awal ? [awal.lng, awal.lat] : undefined,
      zoom: awal ? ZOOM_TITIK : ZOOM_AWAL,
      pitch: terkini.current.tigaD ? KEMIRINGAN_3D : 0,
      bearing: terkini.current.tigaD ? -17 : 0,
    });
    peta.current = p;
    p.on("load", () => {
      tambahGedung3d(p, gelap);
      if (!terkini.current.tigaD) p.setLayoutProperty("gedung-3d", "visibility", "none");
    });
    if (awal) pasangPenanda(p, awal);
    if (!readOnly) {
      p.getCanvas().style.cursor = "crosshair";
      p.on("click", (e: MapMouseEvent) => terkini.current.onChange({ lat: bulatkan(e.lngLat.lat), lng: bulatkan(e.lngLat.lng) }));
    }
    return () => {
      penanda.current?.remove();
      penanda.current = null;
      p.remove();
      peta.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gelap, readOnly]);

  useEffect(() => {
    const p = peta.current;
    if (!p || !value) return;
    pasangPenanda(p, value);
    if (!p.getBounds().contains([value.lng, value.lat]) || p.getZoom() < 15) {
      p.easeTo({ center: [value.lng, value.lat], zoom: Math.max(p.getZoom(), ZOOM_TITIK), duration: geraknyaDikurangi() ? 0 : 700 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);

  const ubah3d = (v: boolean) => {
    setTigaD(v);
    if (peta.current) aturMode3d(peta.current, v);
  };

  return (
    <div className={cn("group/peta relative isolate overflow-hidden", className ?? "h-72 w-full rounded-xl")}>
      <div
        ref={wadah}
        className="h-full w-full"
        role="region"
        aria-label={readOnly ? "Peta lokasi kegiatan" : "Peta untuk memilih lokasi kegiatan. Klik peta untuk menaruh penanda, atau geser penandanya."}
      />
      <p
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-12 z-10 mx-auto w-fit rounded-full bg-foreground/80 px-3 py-1.5 text-xs font-medium text-background opacity-0 transition-opacity duration-200 group-hover/peta:opacity-100 group-data-[zoom=aktif]/peta:opacity-0! pointer-coarse:hidden"
      >
        Klik atau geser peta untuk zoom dengan gulir mouse
      </p>
      <Tombol3d aktif={tigaD} onUbah={ubah3d} className="absolute top-2 left-2 z-10" />
    </div>
  );
}
