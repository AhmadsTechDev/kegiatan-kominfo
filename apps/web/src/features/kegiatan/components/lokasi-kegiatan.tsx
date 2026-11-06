"use client";

import { ChevronDown, LocateFixed, MapPin, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { MapPicker } from "@/components/shared/map-picker";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { alamatDariTitik, type Tempat } from "../lib/geokode";
import type { KegiatanFormValues } from "../schemas/kegiatan.schema";
import { CariLokasi } from "./cari-lokasi";

// Bagian formulir lokasi: cari tempat, klik peta, GPS, atau isi koordinat manual

const bulatkan = (n: number) => Math.round(n * 1e6) / 1e6;
const kunci = (k: { lat: number; lng: number }) => `${k.lat},${k.lng}`;

export function LokasiKegiatan({ form }: { form: UseFormReturn<KegiatanFormValues> }) {
  const {
    register,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = form;
  const [lat, lng] = useWatch({ control, name: ["lat", "lng"] });
  const titik =
    lat.trim() && lng.trim() && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng)) ? { lat: Number(lat), lng: Number(lng) } : null;

  const [alamat, setAlamat] = useState<{ untuk: string; tempat: Tempat | null } | null>(null);
  const [mencariAlamat, setMencariAlamat] = useState(false);
  const [mencariPerangkat, setMencariPerangkat] = useState(false);
  const [manual, setManual] = useState(false);
  const [namaDiketik, setNamaDiketik] = useState(() => !!getValues("lokasiNama")?.trim());
  const [resetCari, setResetCari] = useState(0);
  const dikenal = useRef<Map<string, Tempat>>(new Map());

  const aturTitik = (k: { lat: number; lng: number }) => {
    setValue("lat", String(k.lat), { shouldValidate: true, shouldDirty: true });
    setValue("lng", String(k.lng), { shouldValidate: true, shouldDirty: true });
  };

  const hapusTitik = () => {
    setValue("lat", "", { shouldValidate: true, shouldDirty: true });
    setValue("lng", "", { shouldValidate: true, shouldDirty: true });
    if (!namaDiketik) isiNama("");
    setResetCari((n) => n + 1);
  };

  const isiNama = (nama: string) => setValue("lokasiNama", nama.slice(0, 255), { shouldDirty: true, shouldValidate: true });

  const pilihHasilCari = (t: Tempat) => {
    dikenal.current.set(kunci(t), t);
    aturTitik(t);
  };

  const pilihDariPeta = (k: { lat: number; lng: number }) => {
    aturTitik(k);
    setResetCari((n) => n + 1);
  };

  const kunciTitik = titik ? kunci(titik) : null;
  useEffect(() => {
    if (!titik || !kunciTitik) return;
    const kenal = dikenal.current.get(kunciTitik);
    const batal = new AbortController();
    const tunda = setTimeout(async () => {
      if (kenal) return setAlamat({ untuk: kunciTitik, tempat: kenal });
      setMencariAlamat(true);
      try {
        setAlamat({ untuk: kunciTitik, tempat: await alamatDariTitik(titik.lat, titik.lng, batal.signal) });
      } catch {
        if (!batal.signal.aborted) setAlamat({ untuk: kunciTitik, tempat: null });
      } finally {
        if (!batal.signal.aborted) setMencariAlamat(false);
      }
    }, 500);
    return () => {
      clearTimeout(tunda);
      batal.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunciTitik]);

  const gunakanLokasiSaya = () => {
    if (!("geolocation" in navigator)) return toast.error("Peramban ini tidak mendukung lokasi perangkat.");
    setMencariPerangkat(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pilihDariPeta({ lat: bulatkan(pos.coords.latitude), lng: bulatkan(pos.coords.longitude) });
        setMencariPerangkat(false);
      },
      () => {
        toast.error("Lokasi perangkat tidak dapat dibaca. Cari tempat atau klik langsung di peta.");
        setMencariPerangkat(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const tempat = alamat && alamat.untuk === kunciTitik ? alamat.tempat : null;
  const namaLokasi = useWatch({ control, name: "lokasiNama" });

  useEffect(() => {
    if (tempat && !namaDiketik) isiNama(tempat.nama);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempat, namaDiketik]);
  const bukaManual = manual || !!errors.lat || !!errors.lng;

  return (
    <div className="flex flex-col gap-4 md:col-span-2">

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">
          Titik di peta
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <CariLokasi key={resetCari} onPilih={pilihHasilCari} />
          <Button type="button" variant="outline" className="h-10 shrink-0" onClick={gunakanLokasiSaya} disabled={mencariPerangkat}>
            {mencariPerangkat ? <Spinner /> : <LocateFixed aria-hidden />}
            Lokasi saya
          </Button>
        </div>

        <MapPicker value={titik} onChange={pilihDariPeta} className="h-80 w-full rounded-xl border md:h-96" />

        <div
          aria-live="polite"
          className={cn(
            "flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center",
            titik ? "bg-card" : "border-dashed bg-muted/30",
          )}
        >
          <MapPin aria-hidden className={cn("hidden size-5 shrink-0 sm:block", titik ? "text-primary" : "text-muted-foreground")} />
          <div className="min-w-0 flex-1 text-sm">
            {!titik ? (
              <p className="text-muted-foreground">Belum ada titik. Cari tempat, klik peta, atau pakai lokasi Anda.</p>
            ) : (
              <>
                <p className="truncate font-medium">
                  {mencariAlamat && !tempat ? "Mencari alamat..." : (tempat?.nama ?? "Titik dipilih")}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {tempat?.alamat && `${tempat.alamat} · `}
                  <span className="tabular-nums">
                    {titik.lat.toFixed(6)}, {titik.lng.toFixed(6)}
                  </span>
                </p>
              </>
            )}
          </div>
          {titik && (
            <div className="flex shrink-0 gap-1">
              {tempat && namaDiketik && tempat.nama !== namaLokasi && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    isiNama(tempat.nama);
                    setNamaDiketik(false);
                  }}
                >
                  Pakai sebagai nama lokasi
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={hapusTitik}>
                <X aria-hidden />
                Hapus titik
              </Button>
            </div>
          )}
        </div>
      </div>

      <Field data-invalid={!!errors.lokasiNama}>
        <FieldLabel htmlFor="lokasiNama">
          Nama lokasi
        </FieldLabel>
        <Input
          id="lokasiNama"
          className="h-10"
          maxLength={255}
          placeholder="Opsional, terisi otomatis dari titik di peta"
          aria-invalid={!!errors.lokasiNama}
          {...register("lokasiNama", {
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNamaDiketik(e.target.value.trim() !== ""),
          })}
        />
        <FieldError errors={[errors.lokasiNama]} />
      </Field>

      <div>
        <button
          type="button"
          aria-expanded={bukaManual}
          onClick={() => setManual((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronDown aria-hidden className={cn("size-3.5 transition-transform", bukaManual && "rotate-180")} />
          Isi koordinat manual
        </button>
        {bukaManual && (
          <div className="mt-2 grid gap-4 md:grid-cols-2">
            <Field data-invalid={!!errors.lat}>
              <FieldLabel htmlFor="lat">Lintang</FieldLabel>
              <Input id="lat" inputMode="decimal" className="h-10" placeholder="-2.976100" aria-invalid={!!errors.lat} {...register("lat")} />
              <FieldError errors={[errors.lat]} />
            </Field>
            <Field data-invalid={!!errors.lng}>
              <FieldLabel htmlFor="lng">Bujur</FieldLabel>
              <Input id="lng" inputMode="decimal" className="h-10" placeholder="104.775400" aria-invalid={!!errors.lng} {...register("lng")} />
              <FieldError errors={[errors.lng]} />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}
