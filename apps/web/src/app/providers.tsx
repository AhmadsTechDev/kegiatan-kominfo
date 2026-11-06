"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createQueryClient } from "@/lib/query-client";

/**
 * Provider global: tema, TanStack Query, dan tooltip
 */

/**
 * KONSEP provider (React Context): komponen pembungkus yang "membagikan" sesuatu ke semua komponen di dalamnya,
 * tanpa harus diteruskan lewat props satu per satu. Di sini: tema terang/gelap, cache TanStack Query, dan tooltip.
 * `"use client"` di baris pertama berarti komponen ini berjalan di peramban, karena provider memakai state React.
 * useState(createQueryClient) memastikan QueryClient dibuat SEKALI saja, tidak dibuat ulang setiap render.
 */
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
