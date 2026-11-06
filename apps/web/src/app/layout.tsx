import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";

/**
 * Root layout: font, metadata, Providers global, dan toast
 */

/**
 * KONSEP App Router: struktur folder di src/app menentukan alamat halaman. layout.tsx membungkus semua halaman
 * di foldernya, dan root layout ini membungkus SELURUH aplikasi (tag <html> dan <body> hanya ada di sini).
 * next/font mengunduh font saat build lalu menyajikannya dari server sendiri, jadi tidak ada permintaan ke Google saat dibuka.
 */
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

/**
 * Judul tab peramban; `%s` diganti judul tiap halaman, mis. "Kalender kegiatan · Pendataan Kegiatan".
 */
export const metadata: Metadata = {
  title: {
    default: "Pendataan Kegiatan",
    template: "%s · Pendataan Kegiatan",
  },
  description: "Pendataan Kegiatan Dinas Komunikasi dan Informatika Kota Palembang",
};

/**
 * LayoutProps adalah tipe global buatan Next.js (tidak perlu di-import) berisi `children`, yaitu halaman yang sedang dibuka.
 * suppressHydrationWarning dibutuhkan karena next-themes mengubah kelas tema pada <html> sebelum React siap.
 */
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
