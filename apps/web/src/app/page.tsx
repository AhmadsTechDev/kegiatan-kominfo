import { redirect } from "next/navigation";

/**
 * Rute akar (/) langsung dialihkan ke /dashboard
 */

export default function Home() {
  redirect("/dashboard");
}
