import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginCard } from "@/features/auth/components/login-card";

// Halaman masuk (/login)

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginCard />
    </AuthShell>
  );
}
