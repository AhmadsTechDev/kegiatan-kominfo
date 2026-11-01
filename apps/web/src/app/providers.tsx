// =============================================================================
// PENYEDIA KONTEKS GLOBAL APLIKASI
// =============================================================================
// Gunanya: Membungkus seluruh aplikasi dengan penyedia konteks (React Context):
// ThemeProvider (tema), QueryClientProvider (cache server), dan TooltipProvider.
//
// Catatan penting:
//   - Instance QueryClient dibuat via useState berinisialisasi fungsi agar cache
//     tidak terbagi antar pengguna saat prerender di server.
//   - Tema bawaan adalah terang (light) dan dapat disesuaikan lewat topbar.
//
// Dipakai oleh: frontend/src/app/layout.tsx sebagai pembungkus komponen anak.
// =============================================================================

"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createQueryClient } from "@/lib/query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
