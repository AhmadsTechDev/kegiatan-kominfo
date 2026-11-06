"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTema } from "@/features/pengaturan/hooks/use-akun-saya";

/**
 * Tombol pilih tema terang, gelap, atau ikut sistem
 */

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
