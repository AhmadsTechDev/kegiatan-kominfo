// =============================================================================
// ROOT LAYOUT TATA LETAK UTAMA APLIKASI
// =============================================================================
// Gunanya: Kerangka HTML root seluruh halaman aplikasi; mengatur font Inter dan
// Plus Jakarta Sans, metadata bawaan, context Providers global, dan toast Sonner.
//
// Catatan penting:
//   - Menggunakan suppressHydrationWarning karena next-themes menyetel tema aktif.
//   - Toaster diletakkan di dalam Providers agar gaya notifikasi mengikuti tema.
//
// Dipakai oleh: Next.js App Router sebagai pembungkus utama seluruh rute halaman.
// =============================================================================

import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pendataan Kegiatan",
    template: "%s · Pendataan Kegiatan",
  },
  description: "Pendataan Kegiatan Dinas Komunikasi dan Informatika Kota Palembang",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <Providers>
          {children}
          <Toaster position="top-right" duration={4000} />
        </Providers>
      </body>
    </html>
  );
}
