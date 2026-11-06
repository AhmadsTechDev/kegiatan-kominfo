import { site } from "@/config/site";

// Tata letak halaman publik: kartu di tengah dan nama instansi di bawah

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      {children}
      <footer className="text-center text-xs text-muted-foreground">
        {site.instansi} {site.wilayah}
      </footer>
    </main>
  );
}
