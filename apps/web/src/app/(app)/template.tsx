/**
 * Animasi transisi saat berpindah halaman di grup rute (app)
 */

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex animate-in flex-col gap-6 duration-200 ease-out-expo fade-in slide-in-from-bottom-2">{children}</div>
  );
}
