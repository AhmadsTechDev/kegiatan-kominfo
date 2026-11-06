import type { NextConfig } from "next";

/**
 * Alamat backend Elysia, hanya dipakai di server Next (bukan NEXT_PUBLIC_). Di Vercel diisi alamat backend Railway
 */
const API_URL = (process.env.API_URL || "http://localhost:3001").replace(/\/+$/, "");

/**
 * Pengaturan Next.js untuk seluruh frontend. Bagian terpenting untuk dipahami:
 * - rewrites: peramban memanggil /api/... di domain frontend, lalu server Next yang meneruskannya ke backend.
 *   Karena peramban hanya melihat satu domain, cookie login tidak dianggap "cookie pihak ketiga" dan tidak diblokir.
 * - headers: header keamanan untuk setiap halaman.
 * - reactCompiler: React Compiler mengoptimalkan komponen secara otomatis (mengurangi render ulang yang tidak perlu).
 */
const nextConfig: NextConfig = {
  /**
   * Build Docker (apps/web/Dockerfile) mengisi NEXT_OUTPUT=standalone agar image hanya berisi berkas
   * yang dipakai server. Vercel dan `next start` tetap memakai keluaran biasa.
   */
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,

  /**
   * Header "X-Powered-By: Next.js" tidak perlu diumumkan
   */
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  /**
   * Header keamanan dasar untuk halaman UI (NFR-10). HTTPS dan HSTS ditangani Vercel, atau Caddy di VPS (Caddyfile di root)
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },

  /**
   * Satu origin untuk UI dan API: /api diteruskan ke backend, sehingga cookie sesi tetap milik domain frontend (PRD bagian 8)
   */
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
