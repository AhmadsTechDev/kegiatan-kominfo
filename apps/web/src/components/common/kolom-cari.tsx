"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";

export function KolomCari({
  id,
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  const [teks, setTeks] = useState(value);
  const [nilaiTerakhir, setNilaiTerakhir] = useState(value);
  if (value !== nilaiTerakhir) {
    setNilaiTerakhir(value);
    setTeks(value);
  }
  useEffect(() => {
    if (teks === value) return;
    const t = setTimeout(() => onChange(teks), 300);
    return () => clearTimeout(t);
  }, [teks, value, onChange]);

  return (
    <div className={cn("relative", className)}>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        type="search"
        aria-label={label}
        value={teks}
        onChange={(e) => setTeks(e.target.value)}
        placeholder={placeholder}
        maxLength={100}
        className="h-10 pl-9"
      />
    </div>
  );
}
