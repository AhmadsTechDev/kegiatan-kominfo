import { ArrowLeft, FileQuestion, ShieldX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Tampilan keadaan kegiatan: tidak ditemukan (404), tanpa akses (403), dan skeleton
 */

function KembaliKeDaftar() {
  return (
    <Button asChild variant="outline" className="h-10">
      <Link href="/kegiatan">
        <ArrowLeft aria-hidden />
        Kembali ke daftar kegiatan
      </Link>
    </Button>
  );
}

export function KegiatanTidakDitemukan({
  judul = "Kegiatan tidak ditemukan.",
  pesan = "Kegiatan mungkin sudah dihapus atau tautannya salah.",
}: { judul?: string; pesan?: string }) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent>
        <EmptyState
          icon={FileQuestion}
          title={judul}
          description={pesan}
          action={<KembaliKeDaftar />}
        />
      </CardContent>
    </Card>
  );
}

export function KegiatanTanpaAkses({ pesan }: { pesan: string }) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent>
        <EmptyState icon={ShieldX} title="Anda tidak memiliki akses untuk tindakan ini." description={pesan} action={<KembaliKeDaftar />} />
      </CardContent>
    </Card>
  );
}

export function KegiatanFormSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Memuat form">
      {[6, 4].map((baris, i) => (
        <Card key={i} className="rounded-xl shadow-sm">
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-5 w-32 md:col-span-2" />
            {Array.from({ length: baris }, (_, j) => (
              <div key={j} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function KegiatanDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Memuat kegiatan">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 w-full rounded-xl lg:col-span-2" />
        <div className="flex flex-col gap-6">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
