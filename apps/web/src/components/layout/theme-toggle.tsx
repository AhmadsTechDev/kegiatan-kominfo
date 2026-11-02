// =============================================================================
// PENGALIH TEMA TAMPILAN (THEME TOGGLE)
// =============================================================================
// Gunanya: Menyediakan tombol menu tarik-turun pada bilah atas Aplikasi Pendataan
// Kegiatan untuk mengganti mode tema terang, gelap, atau mengikuti tema sistem.
//
// Isi berkas:
//   - ThemeToggle : tombol dropdown pemilih tema berbasis hook useTheme
//
// Catatan penting:
//   - Ikon matahari dan bulan ditukar via kelas CSS untuk mencegah galat hidrasi.
//   - Pilihan tema ikut disimpan ke preferensi akun sehingga berlaku di perangkat lain.
// =============================================================================

"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTema } from "@/features/pengaturan/hooks/use-akun-saya";

const PILIHAN = [
  { nilai: "light", label: "Terang", ikon: Sun },
  { nilai: "dark", label: "Gelap", ikon: Moon },
  { nilai: "system", label: "Ikuti sistem", ikon: Monitor },
] as const;

export function ThemeToggle() {
  const { tema, pilih } = useTema();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-10 rounded-full text-muted-foreground" aria-label="Ganti tema tampilan">
          <Sun aria-hidden className="size-[18px] dark:hidden" />
          <Moon aria-hidden className="hidden size-[18px] dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Tema tampilan</DropdownMenuLabel>
        {PILIHAN.map(({ nilai, label, ikon: Ikon }) => (
          <DropdownMenuItem key={nilai} onSelect={() => pilih(nilai)}>
            <Ikon aria-hidden />
            {label}
            {tema === nilai && <Check aria-hidden className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
