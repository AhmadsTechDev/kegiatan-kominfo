// =============================================================================
// PROXY PERUTEAN DAN PENGAMANAN NAVIGASI
// =============================================================================
// Gunanya: Mengatur pengalihan rute (redirect) halaman publik dan terproteksi secara
// optimis berdasarkan keberadaan cookie sesi pengguna sebelum halaman dirender.
//
// Isi berkas:
//   - proxy  : penentu rute berdasarkan cookie sesi serta pembersih cookie kedaluwarsa.
//   - config : konfigurasi matcher URL yang dikecualikan (API dan aset statis).
//
// Catatan penting:
//   - Pemeriksaan awal bersifat optimis; otorisasi mutlak tetap di backend (NFR-03).
//   - Permintaan dengan ?sesi=berakhir otomatis menghapus cookie lama yang tertolak.
//   - Tanpa sesi, pengguna diarahkan ke /login?next=halaman-asal agar kembali ke sana setelah login.
//     Untuk / dan /dashboard, ?next= tidak ditulis karena tujuan bawaan setelah login memang dashboard.
//
// Dipakai oleh: Next.js middleware untuk inspeksi request rute aplikasi.
// =============================================================================

import { NextResponse, type NextRequest } from "next/server";

const COOKIE_SESI = ["better-auth.session_token", "__Secure-better-auth.session_token"];
const HALAMAN_PUBLIK = ["/login", "/minta-akun", "/aktivasi"];
const TUJUAN_BAWAAN = ["/", "/dashboard"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const adaSesi = COOKIE_SESI.some((nama) => request.cookies.has(nama));
  const publik = HALAMAN_PUBLIK.includes(pathname);

  if (!adaSesi && !publik) {
    const url = new URL("/login", request.url);
    if (!TUJUAN_BAWAAN.includes(pathname) || search) url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (publik && request.nextUrl.searchParams.get("sesi") === "berakhir") {
    const res = NextResponse.next();
    for (const nama of COOKIE_SESI) if (request.cookies.has(nama)) res.cookies.delete(nama);
    return res;
  }
  if (adaSesi && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|images|favicon.ico|icon.png|apple-icon.png).*)"],
};
