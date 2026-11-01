// =============================================================================
// MENU DROPDOWN AKSI KEGIATAN
// =============================================================================
// Gunanya: Menyediakan menu dropdown tombol titik tiga berisi daftar aksi cepat
// pengelolaan kegiatan, meliputi tautan ubah data, pembatalan, dan penghapusan.
//
// Isi berkas:
//   - KegiatanAksiMenu : tombol pemicu dropdown menu tindakan pada kegiatan
//
// Cara kerja:
//   1. Menampilkan ikon titik tiga sebagai pemicu menu dropdown.
//   2. Menampilkan opsi Ubah data kecuali dinonaktifkan oleh prop tanpaUbah.
//   3. Menyembunyikan opsi Batalkan apabila kegiatan sudah berstatus dibatalkan.
//   4. Opsi Hapus ditandai dengan gaya visual destruktif (merah) untuk peringatan.
//   5. Memilih Batalkan atau Hapus meneruskan jenis aksi ke fungsi onAksi induk.
//
// Catatan penting:
//   - Mengikuti rancangan aksi kontekstual tabel dan detail (DESIGN.md bagian 5.3).
//   - Hanya dirender jika pengguna memiliki hak akses pengubahan (bisaUbah).
//
// Dipakai oleh: components/kegiatan-detail-view.tsx
// =============================================================================

"use client";

import { Ban, Ellipsis, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { KegiatanItem } from "../types";
import type { JenisAksi } from "./kegiatan-aksi-dialog";

type Props = {
  kegiatan: Pick<KegiatanItem, "id" | "judul" | "statusPelaksanaan">;
  onAksi: (aksi: JenisAksi) => void;
  tanpaUbah?: boolean;
};

export function KegiatanAksiMenu({ kegiatan, onAksi, tanpaUbah }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 text-muted-foreground" aria-label={`Aksi lain untuk ${kegiatan.judul}`}>
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!tanpaUbah && (
          <DropdownMenuItem asChild>
            <Link href={`/kegiatan/${kegiatan.id}/ubah`}>
              <Pencil aria-hidden />
              Ubah
            </Link>
          </DropdownMenuItem>
        )}
        {kegiatan.statusPelaksanaan !== "dibatalkan" && (
          <DropdownMenuItem onSelect={() => onAksi("batalkan")}>
            <Ban aria-hidden />
            Batalkan
          </DropdownMenuItem>
        )}
        {(!tanpaUbah || kegiatan.statusPelaksanaan !== "dibatalkan") && <DropdownMenuSeparator />}
        <DropdownMenuItem variant="destructive" onSelect={() => onAksi("hapus")}>
          <Trash2 aria-hidden />
          Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
