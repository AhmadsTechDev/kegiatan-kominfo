"use client";

import { useState } from "react";
import { inisial } from "@/utils/format";
import { cn } from "@/utils/cn";

export function AvatarInisial({ nama, src, className }: { nama: string; src?: string | null; className?: string }) {
  const [gagal, setGagal] = useState<string | null>(null);
  const tampilFoto = src && gagal !== src;
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary text-xs font-bold text-primary",
        className,
      )}
    >
      {tampilFoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" loading="lazy" onError={() => setGagal(src)} />
      ) : (
        inisial(nama)
      )}
    </span>
  );
}
