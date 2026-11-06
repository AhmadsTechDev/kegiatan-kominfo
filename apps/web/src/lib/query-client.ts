import { QueryClient } from "@tanstack/react-query";

/**
 * Membuat QueryClient dengan pengaturan staleTime dan retry
 */

/**
 * KONSEP TanStack Query: library yang mengambil, menyimpan sementara (cache), dan memperbarui data dari API.
 * - staleTime 30 detik: data dianggap masih segar selama 30 detik, jadi berpindah halaman tidak memicu pengambilan ulang.
 * - retry: galat 4xx (salah isian, tidak berhak) tidak dicoba ulang karena hasilnya pasti sama;
 *   galat jaringan/server dicoba ulang paling banyak 2 kali.
 * @returns QueryClient baru untuk dipakai QueryClientProvider
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          const status = (error as { status?: number }).status;
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
      },
    },
  });
}
