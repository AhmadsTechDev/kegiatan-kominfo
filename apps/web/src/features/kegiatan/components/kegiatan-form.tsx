"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, ChevronDown, CircleAlert, FileClock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { AvatarInisial } from "@/components/shared/avatar-inisial";
import { DatePicker } from "@/components/shared/date-picker";
import { JamPicker } from "@/components/shared/jam-picker";
import { Panel } from "@/components/shared/panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useProfil } from "@/features/auth/hooks/use-profil";
import { ApiError } from "@/lib/api-client";
import { formatTanggal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getKegiatan } from "../api/kegiatan";
import { kegiatanKeys, useBuatKegiatan, useSimpanDraf, useUbahKegiatan } from "../hooks/use-kegiatan";
import {
  KOLOM_SERVER,
  keIsiDraf,
  keKegiatanPayload,
  kegiatanSchema,
  nilaiAwalForm,
  type KegiatanFormValues,
} from "../schemas/kegiatan.schema";
import type { Draf, KegiatanDetail, Referensi } from "../types";
import { DokumentasiGaleri, type StatusAntrean } from "./dokumentasi-galeri";
import { LokasiKegiatan } from "./lokasi-kegiatan";

/**
 * Formulir kegiatan: dua langkah untuk kegiatan baru, satu layar untuk ubah
 */

type Props = {
  referensi: Referensi;
  kegiatan?: KegiatanDetail;
  penanggungJawabBawaan?: number | null;
  draf?: Draf;
};

const LANGKAH = [
  { judul: "Informasi kegiatan", pendek: "Informasi", keterangan: "Judul, jenis, dan uraian singkat" },
  { judul: "Waktu dan lokasi", pendek: "Jadwal", keterangan: "Jadwal (WIB) dan tempat kegiatan" },
] as const;
const KOLOM_LANGKAH_1: FieldPath<KegiatanFormValues>[] = ["judul", "jenisId", "jumlahPeserta", "uraian"];

function BarisRingkasan({ label, nilai }: { label: string; nilai: string | null }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 break-words", nilai ? "font-medium" : "text-destructive")}>{nilai ?? "Belum diisi"}</dd>
    </div>
  );
}

function PenunjukLangkah({ aktif, onPilih }: { aktif: number; onPilih: (i: number) => void }) {
  return (
    <ol className="grid grid-cols-2 gap-2" aria-label="Langkah pengisian">
      {LANGKAH.map((l, i) => {
        const selesai = i < aktif;
        const sekarang = i === aktif;
        return (
          <li key={l.judul}>
            <button
              type="button"
              onClick={() => selesai && onPilih(i)}
              disabled={!selesai}
              aria-current={sekarang ? "step" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                sekarang ? "border-primary bg-secondary" : selesai ? "hover:bg-muted" : "opacity-60",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  sekarang || selesai ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {selesai ? <Check className="size-4" /> : i + 1}
              </span>
              <span className="min-w-0">
                {/* Di HP judul pendek agar tidak terpotong */}
                <span className={cn("block truncate text-sm font-semibold", sekarang && "text-primary")}>
                  <span className="sm:hidden">{l.pendek}</span>
                  <span className="hidden sm:inline">{l.judul}</span>
                </span>
                <span className="hidden truncate text-xs text-muted-foreground sm:block">{l.keterangan}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Form catat/ubah kegiatan.
 * KONSEP react-hook-form: library pengelola form. `register` menghubungkan input ke form, `Controller` dipakai untuk
 * komponen buatan sendiri (DatePicker, Select), dan zodResolver membuat validasinya memakai kegiatanSchema.
 * Alur simpan: validasi di peramban -> kirim lewat mutation -> galat 422 dari backend dipasang ke kolomnya,
 * 409 (diubah orang lain) menampilkan dialog konflik.
 * @param referensi pilihan bidang, jenis, dan pegawai
 * @param kegiatan kegiatan yang diubah; kosong berarti catat baru (form dua langkah)
 * @param penanggungJawabBawaan pegawai yang otomatis menjadi penanggung jawab
 * @param draf draf yang sedang dilanjutkan, bila ada
 */
export function KegiatanForm({ referensi, kegiatan, penanggungJawabBawaan, draf }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const buat = useBuatKegiatan();
  const ubah = useUbahKegiatan(kegiatan?.id ?? 0);
  const simpanDraf = useSimpanDraf();
  const [galatUmum, setGalatUmum] = useState<string | null>(null);
  const [konflik, setKonflik] = useState(false);
  const [memuatUlang, setMemuatUlang] = useState(false);
  const bertahap = !kegiatan;
  const [langkah, setLangkah] = useState(0);
  const awalSelesai = kegiatan?.statusPelaksanaan === "selesai";
  const [semuaKolom, setSemuaKolom] = useState(!awalSelesai);

  /**
   * Simpan ditahan selama berkas dokumentasi masih dipilih tapi belum diunggah, atau sedang diunggah
   */
  const [antrean, setAntrean] = useState<StatusAntrean>("kosong");
  const tahanSimpan = antrean !== "kosong";

  const form = useForm<KegiatanFormValues>({
    resolver: zodResolver(kegiatanSchema),
    defaultValues: draf ? { ...nilaiAwalForm(undefined, penanggungJawabBawaan), ...draf.isi } : nilaiAwalForm(kegiatan, penanggungJawabBawaan),
  });
  const {
    register,
    control,
    handleSubmit,
    setError,
    trigger,
    getValues,
    formState: { errors, isDirty },
  } = form;

  /**
   * useWatch membaca nilai kolom secara langsung (ikut berubah saat diketik) untuk ringkasan di langkah terakhir.
   */
  const [tglMulai, jamMulai, tglSelesai, jamSelesai, judul, jenisId, lokasiNama] = useWatch({
    control,
    name: ["tanggalMulai", "jamMulai", "tanggalSelesai", "jamSelesai", "judul", "jenisId", "lokasiNama"],
  });

  const pj = referensi.pegawai.find((p) => p.id === (kegiatan?.penanggungJawab.id ?? penanggungJawabBawaan));
  const unitPj = referensi.bidang.find((u) => u.id === pj?.bidangId);
  const profil = useProfil();
  const fotoPj = pj && profil.data?.pegawai?.id === pj.id ? profil.data.foto : null;

  /**
   * isSuccess ikut dihitung "sibuk" agar tombol tetap nonaktif selama halaman berpindah setelah simpan berhasil (mencegah klik ganda).
   */
  const sibuk = buat.isPending || ubah.isPending || buat.isSuccess || ubah.isSuccess || simpanDraf.isPending || simpanDraf.isSuccess;

  /**
   * Menerjemahkan galat backend: 409 -> dialog konflik; 422 dengan details -> pesan dipasang ke kolom yang sesuai
   * (KOLOM_SERVER memetakan nama kolom backend ke nama kolom form) dan form pindah ke langkah tempat kolom itu berada;
   * galat lainnya ditampilkan sebagai pesan umum di atas tombol.
   */
  const tanganiGalat = (e: unknown) => {
    if (e instanceof ApiError && e.status === 409) return setKonflik(true);
    if (e instanceof ApiError && e.status === 422 && e.details?.length) {
      let adaKolom = false;
      for (const d of e.details) {
        const kolom = d.field ? KOLOM_SERVER[d.field] : undefined;
        if (kolom) {
          if (kolom !== "hasil") setSemuaKolom(true);
          if (!adaKolom && bertahap) setLangkah(KOLOM_LANGKAH_1.includes(kolom) ? 0 : 1);
          adaKolom = true;
          setError(kolom as FieldPath<KegiatanFormValues>, { message: d.message }, { shouldFocus: true });
        }
      }
      if (adaKolom) return setGalatUmum(null);
    }
    setGalatUmum(e instanceof Error ? e.message : "Terjadi kesalahan. Coba lagi beberapa saat.");
  };

  const selesai = (hasil: { id: number }) => {
    toast.success(kegiatan ? "Perubahan disimpan" : "Kegiatan dicatat", {
      description: kegiatan ? undefined : "Unggah dokumentasi dan isi hasilnya setelah kegiatan berlangsung.",
    });
    router.push(`/kegiatan/${hasil.id}`);
  };

  /**
   * handleSubmit menjalankan validasi dulu: fungsi pertama dipanggil bila semua kolom sah, fungsi kedua bila ada yang salah.
   */
  const onSubmit = handleSubmit(
    (nilai) => {
      if (tahanSimpan) return;
      setGalatUmum(null);
      const payload = keKegiatanPayload(nilai);
      if (kegiatan) {
        ubah.mutate({ ...payload, expectedUpdatedAt: kegiatan.updatedAt }, { onSuccess: selesai, onError: tanganiGalat });
      } else {
        buat.mutate({ ...payload, drafId: draf?.id }, { onSuccess: selesai, onError: tanganiGalat });
      }
    },
    (galat) => {
      if (Object.keys(galat).some((k) => k !== "hasil")) setSemuaKolom(true);
      if (bertahap && KOLOM_LANGKAH_1.some((k) => k in galat)) setLangkah(0);
    },
  );

  const keDraf = () => {
    setGalatUmum(null);
    simpanDraf.mutate(
      { id: draf?.id, isi: keIsiDraf(getValues()) },
      {
        onSuccess: () => {
          toast.success("Draf disimpan", { description: "Lanjutkan kapan saja dari daftar kegiatan." });
          router.push("/kegiatan");
        },
        onError: (e) => setGalatUmum(e instanceof Error ? e.message : "Draf gagal disimpan. Coba lagi."),
      },
    );
  };

  const waktuRingkas =
    tglMulai && tglSelesai
      ? `${formatTanggal(tglMulai)} ${jamMulai} – ${tglSelesai === tglMulai ? "" : `${formatTanggal(tglSelesai)} `}${jamSelesai}`
      : null;

  /**
   * trigger(...) memvalidasi hanya kolom langkah 1; pengguna baru boleh lanjut ke langkah 2 bila kolom-kolom itu sah.
   */
  const lanjut = async () => {
    if (await trigger(KOLOM_LANGKAH_1, { shouldFocus: true })) {
      setLangkah(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /**
   * Saat konflik, data terbaru diambil langsung (fetchQuery, staleTime 0 = abaikan cache) lalu form diisi ulang dengan data itu.
   */
  const muatUlang = async () => {
    if (!kegiatan) return;
    setMemuatUlang(true);
    try {
      const terbaru = await queryClient.fetchQuery({
        queryKey: kegiatanKeys.detail(kegiatan.id),
        queryFn: () => getKegiatan(kegiatan.id),
        staleTime: 0,
      });
      form.reset(nilaiAwalForm(terbaru));
      ubah.reset();
      setKonflik(false);
    } catch {
      toast.error("Data terbaru gagal dimuat. Coba lagi.");
    } finally {
      setMemuatUlang(false);
    }
  };

  const tampilInfo = bertahap ? langkah === 0 : semuaKolom;
  const tampilWaktu = bertahap ? langkah === 1 : semuaKolom;
  const langkahTerakhir = !bertahap || langkah === LANGKAH.length - 1;

  const bagianInfo = (
    <section className="p-4 md:p-6">
      {!bertahap && <h2 className="mb-5 font-heading text-base font-bold">Informasi kegiatan</h2>}
      <div className="grid gap-4 md:grid-cols-2">
        <Field data-invalid={!!errors.judul} className="md:col-span-2">
          <FieldLabel htmlFor="judul">
            Judul kegiatan
          </FieldLabel>
          <Input
            id="judul"
            className="h-10"
            maxLength={200}
            placeholder="Contoh: Rapat koordinasi SPBE"
            aria-required
            aria-invalid={!!errors.judul}
            {...register("judul")}
          />
          <FieldError errors={[errors.judul]} />
        </Field>

        <Field data-invalid={!!errors.jenisId}>
          <FieldLabel htmlFor="jenisId">
            Jenis kegiatan
          </FieldLabel>
          <Controller
            control={control}
            name="jenisId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="jenisId"
                  ref={field.ref}
                  onBlur={field.onBlur}
                  className="h-10 w-full"
                  aria-required
                  aria-invalid={!!errors.jenisId}
                >
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  {referensi.jenisKegiatan.map((j) => (
                    <SelectItem key={j.id} value={String(j.id)}>
                      {j.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.jenisId]} />
        </Field>

        <Field data-invalid={!!errors.jumlahPeserta}>
          <FieldLabel htmlFor="jumlahPeserta">Perkiraan jumlah peserta</FieldLabel>
          <Input
            id="jumlahPeserta"
            inputMode="numeric"
            className="h-10"
            maxLength={6}
            placeholder="Mis. 25"
            aria-invalid={!!errors.jumlahPeserta}
            {...register("jumlahPeserta")}
          />
          <FieldError errors={[errors.jumlahPeserta]} />
        </Field>

        <Field data-invalid={!!errors.uraian} className="md:col-span-2">
          <FieldLabel htmlFor="uraian">Uraian kegiatan</FieldLabel>
          <Textarea
            id="uraian"
            rows={4}
            maxLength={5000}
            placeholder="Tuliskan ringkasan kegiatan..."
            aria-invalid={!!errors.uraian}
            {...register("uraian")}
          />
          <FieldError errors={[errors.uraian]} />
        </Field>

      </div>
    </section>
  );

  const bagianHasil = (
    <section className="p-4 md:p-6">
      <Field data-invalid={!!errors.hasil}>
        <FieldLabel htmlFor="hasil" className="font-heading text-base font-bold">
          Hasil kegiatan
        </FieldLabel>
        <Textarea
          id="hasil"
          rows={4}
          maxLength={5000}
          placeholder="Hasil atau tindak lanjut..."
          aria-invalid={!!errors.hasil}
          {...register("hasil")}
        />
        <FieldError errors={[errors.hasil]} />
      </Field>
    </section>
  );

  const bagianWaktu = (
    <section className="p-4 md:p-6">
      {!bertahap && <h2 className="mb-5 font-heading text-base font-bold">Waktu dan lokasi</h2>}
      <div className="grid gap-4 md:grid-cols-2">
        {(
          [
            { tanggal: "tanggalMulai", jam: "jamMulai", label: "Mulai" },
            { tanggal: "tanggalSelesai", jam: "jamSelesai", label: "Selesai" },
          ] as const
        ).map(({ tanggal, jam, label }) => (
          <Field key={tanggal} data-invalid={!!errors[tanggal] || !!errors[jam]}>
            <FieldLabel htmlFor={tanggal}>
              {label} <span className="font-normal text-muted-foreground">(WIB)</span>
            </FieldLabel>
            <div className="grid grid-cols-[1fr_7rem] gap-2">
              <Controller
                control={control}
                name={tanggal}
                render={({ field }) => <DatePicker id={tanggal} value={field.value} onChange={field.onChange} invalid={!!errors[tanggal]} />}
              />
              <Controller
                control={control}
                name={jam}
                render={({ field }) => (
                  <JamPicker
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    invalid={!!errors[jam]}
                    aria-label={`Jam ${label.toLowerCase()} (WIB)`}
                    mulai={jam === "jamSelesai" && tglMulai && tglMulai === tglSelesai ? jamMulai : undefined}
                  />
                )}
              />
            </div>
            <FieldError errors={[errors[tanggal], errors[jam]]} />
          </Field>
        ))}

        <LokasiKegiatan form={form} />
      </div>
    </section>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-4xl flex-col gap-4 pb-20 md:pb-0">
      {bertahap && <PenunjukLangkah aktif={langkah} onPilih={setLangkah} />}

      {galatUmum && (
        <Alert variant="destructive" aria-live="polite">
          <CircleAlert />
          <AlertDescription>{galatUmum}</AlertDescription>
        </Alert>
      )}

      <Panel className="divide-y divide-muted">
        {pj && (
          <div className="flex items-center gap-3 px-4 py-3 md:px-6">
            <AvatarInisial nama={pj.nama} src={fotoPj} className="size-9 rounded-full" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">{pj.nama}</p>
              {unitPj && <p className="truncate text-xs text-muted-foreground">{unitPj.nama}</p>}
            </div>
          </div>
        )}
        {/* Ubah: waktu dan lokasi paling bawah; kegiatan selesai mendahulukan hasil dan dokumentasi */}
        {tampilInfo && !awalSelesai && bagianInfo}
        {bertahap && tampilWaktu && bagianWaktu}
        {kegiatan && bagianHasil}
        {bertahap && langkah === LANGKAH.length - 1 && (
          <section className="p-4 md:p-6" aria-labelledby="judul-ringkasan">
            <h2 id="judul-ringkasan" className="mb-2 font-heading text-base font-bold">
              Ringkasan
            </h2>
            <dl className="divide-y divide-muted">
              <BarisRingkasan label="Judul" nilai={judul.trim() || null} />
              <BarisRingkasan label="Jenis" nilai={referensi.jenisKegiatan.find((j) => String(j.id) === jenisId)?.nama ?? null} />
              <BarisRingkasan label="Waktu (WIB)" nilai={waktuRingkas} />
              <BarisRingkasan label="Lokasi" nilai={lokasiNama.trim() || null} />
            </dl>
          </section>
        )}
        {kegiatan && (
          <section className="p-4 md:p-6">
            <div className="mb-5 flex flex-col gap-0.5">
              <h2 className="font-heading text-base font-bold">Dokumentasi</h2>
              <p className="text-xs text-muted-foreground">Berkas langsung diunggah dan tersimpan begitu dipilih.</p>
            </div>
            <DokumentasiGaleri kegiatan={kegiatan} onAntreanBerubah={setAntrean} />
          </section>
        )}
        {kegiatan && awalSelesai && semuaKolom && bagianInfo}
        {kegiatan && semuaKolom && bagianWaktu}
        {kegiatan && !semuaKolom && (
          <div className="p-2 md:px-4">
            <Button type="button" variant="ghost" className="h-10 w-full justify-between text-muted-foreground pointer-coarse:min-h-11" onClick={() => setSemuaKolom(true)}>
              Ubah data kegiatan
              <ChevronDown aria-hidden />
            </Button>
          </div>
        )}
      </Panel>
      {errors.penanggungJawabId && (
        <p role="alert" className="text-sm text-destructive">
          {errors.penanggungJawabId.message}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-wrap gap-2 border-t bg-card p-3 md:static md:justify-end md:border-0 md:bg-transparent md:p-0">
        {tahanSimpan && (
          <p id="tahan-simpan" aria-live="polite" className="basis-full text-xs text-muted-foreground md:text-right">
            Tunggu sampai unggahan selesai.
          </p>
        )}
        {bertahap && langkah > 0 ? (
          <Button type="button" variant="outline" className="h-11 flex-1 md:h-10 md:flex-none" onClick={() => setLangkah(langkah - 1)} disabled={sibuk}>
            <ArrowLeft aria-hidden />
            Kembali
          </Button>
        ) : (
          <Button asChild variant="outline" className="h-11 flex-1 md:h-10 md:flex-none">
            <Link href={kegiatan ? `/kegiatan/${kegiatan.id}` : "/kegiatan"}>Batal</Link>
          </Button>
        )}
        {bertahap && (
          <Button type="button" variant="outline" className="h-11 flex-1 md:h-10 md:flex-none" onClick={keDraf} disabled={sibuk || (!isDirty && !draf)}>
            {simpanDraf.isPending ? <Spinner /> : <FileClock aria-hidden />}
            {simpanDraf.isPending ? "Menyimpan..." : "Simpan draf"}
          </Button>
        )}
        {langkahTerakhir ? (
          <Button
            key="simpan"
            type="submit"
            className="h-11 flex-1 md:h-10 md:flex-none"
            disabled={sibuk || tahanSimpan}
            aria-describedby={tahanSimpan ? "tahan-simpan" : undefined}
          >
            {sibuk ? <Spinner /> : <Check aria-hidden />}
            {sibuk ? "Menyimpan..." : kegiatan ? "Simpan perubahan" : "Simpan kegiatan"}
          </Button>
        ) : (
          <Button key="lanjut" type="button" className="h-11 flex-1 md:h-10 md:flex-none" onClick={lanjut}>
            Lanjut
            <ArrowRight aria-hidden />
          </Button>
        )}
      </div>

      <AlertDialog open={konflik}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kegiatan sudah diubah</AlertDialogTitle>
            <AlertDialogDescription>
              Kegiatan ini baru saja diubah orang lain. Muat ulang untuk melihat versi terbaru. Isian Anda di form ini akan diganti dengan data terbaru.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button className="h-10" onClick={muatUlang} disabled={memuatUlang}>
              {memuatUlang && <Spinner />}
              Muat ulang
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
