import { NextResponse, type NextRequest } from "next/server";

/**
 * Pengalihan halaman publik/terproteksi berdasarkan ada tidaknya cookie sesi
 */

/**
 * KONSEP proxy (di Next.js versi lama bernama "middleware"): fungsi yang berjalan di server SEBELUM halaman dirender.
 * Di sini dipakai untuk pengalihan cepat: belum login -> ke /login, sudah login tapi membuka /login -> ke /dashboard.
 * Ini hanya pengecekan awal berdasarkan ADA TIDAKNYA cookie; keabsahan sesi tetap dicek backend di setiap permintaan API.
 *
 * Nama cookie berawalan __Secure- dipakai di produksi (HTTPS).
 */
const COOKIE_SESI = ["better-auth.session_token", "__Secure-better-auth.session_token"];
const HALAMAN_PUBLIK = ["/login", "/minta-akun", "/aktivasi", "/lupa-sandi", "/reset-sandi", "/konfirmasi-email"];
const TUJUAN_BAWAAN = ["/", "/dashboard"];

/**
 * @param request permintaan halaman dari peramban
 * @returns NextResponse.redirect untuk mengalihkan, atau NextResponse.next() untuk melanjutkan ke halaman
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const adaSesi = COOKIE_SESI.some((nama) => request.cookies.has(nama));
  const publik = HALAMAN_PUBLIK.includes(pathname);

  if (!adaSesi && !publik) {
    const url = new URL("/login", request.url);

    /**
     * Alamat yang dituju disimpan di ?next= supaya setelah login pengguna kembali ke halaman itu.
     */
    if (!TUJUAN_BAWAAN.includes(pathname) || search) url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  /**
   * ?sesi=berakhir dikirim oleh api-client saat backend menjawab 401; cookie lama dihapus agar proxy tidak terus mengira pengguna masih login.
   */
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

/**
 * matcher menentukan alamat mana yang melewati proxy: semua halaman kecuali /api, berkas statis Next, gambar, dan ikon.
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|images|favicon.ico|icon.png|apple-icon.png).*)"],
};
