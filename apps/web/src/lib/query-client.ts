// =============================================================================
// PABRIK QUERY CLIENT (TANSTACK QUERY)
// =============================================================================
// Gunanya: Membuat instance QueryClient baru dengan konfigurasi durasi cache segar
// (staleTime) dan aturan percobaan ulang (retry) permintaan data ke server.
//
// Isi berkas:
//   - createQueryClient : fungsi pembuat instance QueryClient untuk penyedia global.
//
// Catatan penting:
//   - staleTime diatur 30 detik untuk efisiensi transfer data dan kesegaran UI.
//   - Kesalahan klien HTTP 4xx (400, 403, 404) tidak diulang; error server diulang 2 kali.
//
// Dipakai oleh: frontend/src/app/providers.tsx pada inisialisasi QueryClientProvider.
// =============================================================================

import { QueryClient } from "@tanstack/react-query";

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
