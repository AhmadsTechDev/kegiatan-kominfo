import Link from "next/link";
import { KartuPublik, KepalaKartu } from "./kartu-publik";
import { LoginForm } from "./login-form";

// Kartu halaman login: judul, LoginForm, dan tautan minta akun

export function LoginCard() {
  return (
    <KartuPublik>
      <KepalaKartu judul="Masuk" />
      <LoginForm />
      <p className="border-t pt-5 text-center text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link href="/minta-akun" className="inline-flex items-center rounded font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11">
          Minta akun
        </Link>
      </p>
    </KartuPublik>
  );
}
