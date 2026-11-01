// =============================================================================
// TAMPILAN HALAMAN CETAK LAPORAN
// =============================================================================
// Gunanya: Menyusun dan merender tata letak halaman laporan A4 mendatar untuk
// keperluan pratinjau di layar peramban maupun dokumen cetak langsung.
//
// Isi berkas:
//   - bagiHalaman    : membagi baris kegiatan ke beberapa halaman cetak
//   - Kop            : komponen kepala surat dinas, judul, dan kartu ringkasan
//   - HalamanLaporan : merender lembar-lembar halaman A4 dengan tabel kegiatan
//
// Cara kerja:
//   1. Membagi data baris (halaman pertama 7 baris karena memuat kop dinas,
//      halaman berikutnya masing-masing 12 baris).
//   2. Mengulang kepala tabel pada setiap lembar halaman demi kemudahan baca.
//   3. Menampilkan catatan kaki nomor halaman serta waktu pencetakan.
//
// Catatan penting:
//   - Mengacu pada dokumen features/05-cetak-unduh-laporan.md dengan rasio A4
//     mendatar dan tema kertas (latar putih tinta gelap) pada semua mode tampilan.
//
// Dipakai oleh: frontend/src/features/laporan/components/laporan-view.tsx
// =============================================================================

import Image from "next/image";
import { site } from "@/config/site";
import { formatAngka } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PratinjauLaporan } from "../types";

const BARIS_HALAMAN_PERTAMA = 7;
const BARIS_PER_HALAMAN = 12;

export function bagiHalaman<T>(baris: T[]): T[][] {
  const halaman: T[][] = [baris.slice(0, BARIS_HALAMAN_PERTAMA)];
  for (let i = BARIS_HALAMAN_PERTAMA; i < baris.length; i += BARIS_PER_HALAMAN) halaman.push(baris.slice(i, i + BARIS_PER_HALAMAN));
  return halaman;
}

function Kop({ data }: { data: PratinjauLaporan }) {
  return (
    <>
      <div className="flex items-center gap-4 pb-2">
        <Image src={site.logo} alt="" width={46} height={51} className="h-[51px] w-auto object-contain" />
        <div className="flex-1 pr-[46px] text-center">
          <p className="text-[15px] font-bold">{data.kop.pemerintah}</p>
          <p className="text-[18px] font-bold">{data.kop.dinas}</p>
          {data.kop.alamat && <p className="text-[11px] text-slate-500">{data.kop.alamat}</p>}
        </div>
      </div>
      <div className="border-b-2 border-black" />
      <div className="mt-[2px] mb-4 border-b border-black" />
      <p className="text-center text-[15px] font-bold">{data.judul}</p>
      <p className="mt-1 mb-3 text-center text-[11px] text-slate-500">{data.subjudul}</p>
      <div className="mb-3 flex gap-2">
        {data.ringkasan.map((r) => (
          <div key={r.label} className="flex-1 rounded border border-slate-300 px-2 py-1.5">
            <p className="text-[10px] text-slate-500">{r.label}</p>
            <p className="text-[17px] font-bold tabular-nums">{formatAngka(r.nilai)}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export function HalamanLaporan({ data, className }: { data: PratinjauLaporan; className?: string }) {
  const halaman = bagiHalaman(data.baris);
  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      {halaman.map((isi, h) => {
        const nomorAwal = h === 0 ? 0 : BARIS_HALAMAN_PERTAMA + (h - 1) * BARIS_PER_HALAMAN;
        return (
          <article
            key={h}
            aria-label={`Halaman ${h + 1} dari ${halaman.length}`}
            className="halaman-laporan relative flex aspect-[297/210] w-full max-w-[1123px] flex-col bg-white px-[3%] pt-[2.5%] pb-[4%] font-sans text-[11px] text-slate-900 shadow-md ring-1 ring-black/10"
          >
            {h === 0 && <Kop data={data} />}
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                {data.kolom.map((k) => (
                  <col key={k.judul} style={{ width: k.lebar }} />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-[#0f2a4a] text-left text-white">
                  {data.kolom.map((k) => (
                    <th key={k.judul} className="px-1 py-1 font-bold">
                      {k.judul}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isi.map((b, i) => (
                  <tr key={b.id} className="border-b border-slate-300 align-top">
                    <td className="px-1 py-1">{nomorAwal + i + 1}</td>
                    <td className="px-1 py-1">
                      {b.judul}
                      {b.lokasi && <span className="mt-px block text-[10px] text-slate-500">{b.lokasi}</span>}
                    </td>
                    <td className="px-1 py-1">{b.jenis}</td>
                    <td className="px-1 py-1">{b.unitKerja}</td>
                    <td className="px-1 py-1">{b.penanggungJawab}</td>
                    <td className="px-1 py-1">{b.waktu}</td>
                    <td className="px-1 py-1">{b.peserta}</td>
                    <td className="px-1 py-1">{b.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.baris.length === 0 && <p className="p-6 text-center text-slate-500">Tidak ada kegiatan yang sesuai filter.</p>}
            <div className="absolute inset-x-[3%] bottom-[2%] flex justify-between text-[10px] text-slate-500">
              <span>{data.kaki}</span>
              <span>
                Halaman {h + 1} dari {halaman.length}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
