import Image from "next/image";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";
import type { PratinjauLaporan } from "../types";

/**
 * Tata letak halaman laporan A4 mendatar untuk pratinjau dan cetak
 */

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
        <Image src={site.logo} alt="" width={90} height={100} className="h-[100px] w-auto object-contain" />
        <div className="flex-1 pr-[90px] text-center leading-snug text-black">
          <p className="text-[18px]">{data.kop.pemerintah}</p>
          <p className="text-[21px] font-bold">{data.kop.dinas}</p>
          <div className="mt-1 text-[11px]">
            {data.kop.alamat.map((baris) => (
              <p key={baris}>{baris}</p>
            ))}
          </div>
        </div>
      </div>
      <div className="mb-4 border-b-4 border-black" />
      <p className="text-center text-[15px] font-bold">{data.judul}</p>
      <p className="mt-1 mb-4 text-center text-[12px]">{data.subjudul}</p>
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
            className="halaman-laporan relative flex aspect-[297/210] w-full max-w-[1123px] flex-col bg-white px-[3%] pt-[2.5%] pb-[3%] font-sans text-[11px] text-slate-900 shadow-md ring-1 ring-black/10"
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
                    <td className="px-1 py-1">{b.bidang}</td>
                    <td className="px-1 py-1">{b.penanggungJawab}</td>
                    <td className="px-1 py-1">{b.waktu}</td>
                    <td className="px-1 py-1">{b.peserta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.baris.length === 0 && <p className="p-6 text-center text-slate-500">Tidak ada kegiatan yang sesuai filter.</p>}
          </article>
        );
      })}
    </div>
  );
}
