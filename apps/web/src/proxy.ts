import { NextResponse, type NextRequest } from "next/server";

// Pengalihan halaman publik/terproteksi berdasarkan ada tidaknya cookie sesi

const COOKIE_SESI = ["better-auth.session_token", "__Secure-better-auth.session_token"];
const HALAMAN_PUBLIK = ["/login", "/minta-akun", "/aktivasi", "/lupa-sandi", "/reset-sandi", "/konfirmasi-email"];
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
