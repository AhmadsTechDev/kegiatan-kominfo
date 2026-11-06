import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";

// Root layout: font, metadata, Providers global, dan toast

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
