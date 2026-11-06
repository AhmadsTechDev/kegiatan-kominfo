"use client";

/**
 * Penangkap galat fatal di root layout agar tidak jadi layar putih
 */

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Aplikasi gagal dimuat</h1>
            <p style={{ fontSize: 14, color: "#475569", margin: "0 0 20px" }}>
              Muat ulang halaman. Bila masih gagal, hubungi administrator aplikasi.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{ height: 40, padding: "0 16px", borderRadius: 8, border: 0, background: "#1d4ed8", color: "#fff", fontWeight: 600, cursor: "pointer" }}
            >
              Coba lagi
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
