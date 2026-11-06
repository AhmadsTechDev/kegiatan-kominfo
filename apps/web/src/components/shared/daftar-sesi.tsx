import { Laptop, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTanggalJam } from "@/lib/format";

/**
 * Daftar sesi login aktif (perangkat, IP, waktu) dengan tombol cabut opsional
 */

export type Sesi = { id: string; ipAddress: string | null; userAgent: string | null; createdAt: string; updatedAt: string; sesiIni?: boolean };

const PERAMBAN: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser/, "Samsung Internet"],
  [/Firefox\//, "Firefox"],
  [/Chrome\//, "Chrome"],
  [/Safari\//, "Safari"],
];
const SISTEM: [RegExp, string][] = [
  [/Android/, "Android"],
  [/iPhone|iPad|iOS/, "iOS"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
];

export function namaPerangkat(ua: string | null) {
  if (!ua) return { teks: "Perangkat tidak dikenal", seluler: false };
  const peramban = PERAMBAN.find(([r]) => r.test(ua))?.[1];
  const sistem = SISTEM.find(([r]) => r.test(ua))?.[1];
  const teks = peramban && sistem ? `${peramban} di ${sistem}` : (peramban ?? sistem ?? "Perangkat tidak dikenal");
  return { teks, seluler: /Mobi|Android|iPhone|iPad/.test(ua) };
}

export function DaftarSesi({ sesi, onCabut, pendingId }: { sesi: Sesi[]; onCabut?: (s: Sesi) => void; pendingId?: string | null }) {
  return (
    <ul className="divide-y divide-muted">
      {sesi.map((s) => {
        const { teks, seluler } = namaPerangkat(s.userAgent);
        const Ikon = seluler ? Smartphone : Laptop;
        return (
          <li key={s.id} className="flex items-center gap-3 py-3">
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Ikon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="flex flex-wrap items-center gap-x-2 font-medium">
                {teks}
                {s.sesiIni && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">Perangkat ini</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {/* IP bisa kosong (mis. di balik proxy); jangan sisakan pemisah "·" di depan */}
                {[s.ipAddress?.trim(), `masuk ${formatTanggalJam(s.createdAt)}`, `aktif terakhir ${formatTanggalJam(s.updatedAt)}`].filter(Boolean).join(" · ")}
              </p>
            </div>
            {onCabut && !s.sesiIni && (
              <Button variant="ghost" size="sm" className="h-9 pointer-coarse:min-h-11 shrink-0 text-muted-foreground hover:text-destructive" disabled={pendingId === s.id} onClick={() => onCabut(s)} aria-label={`Keluarkan ${teks}`}>
                <X aria-hidden />
                Keluarkan
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
