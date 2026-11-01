// =============================================================================
// TAMPILAN INDUK PENGELOLAAN MASTER DATA
// =============================================================================
// Gunanya: menyediakan wadah navigasi bertab untuk mengelola seluruh master data
// aplikasi: pegawai, unit kerja utama, sub bagian/seksi, dan jenis kegiatan.
//
// Isi berkas:
//   - MasterView : komponen induk pengatur tab master data dengan navigasi URL
//
// Cara kerja:
//   1. Membaca parameter query URL (?tab= dan ?induk=) untuk menentukan tab aktif.
//   2. Menampilkan jumlah data pada masing-masing label tab dari TanStack Query cache.
//   3. Mengarahkan pergantian tab via router.replace tanpa memicu pemuatan ulang halaman.
//
// Catatan penting:
//   - Memenuhi FR-02 (status tab di URL mempermudah bookmark dan pembagian tautan).
//   - Halaman dilindungi oleh AdminGuard agar hanya dapat diakses oleh peran ADMIN.
//
// Dipakai oleh: frontend/src/app/(app)/admin/master/page.tsx
// =============================================================================

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { useJenisAdmin, usePegawaiAdmin, useUnitKerjaAdmin } from "../hooks/use-admin";
import { AdminGuard, PilihanTab } from "./admin-shared";
import { JenisTab } from "./jenis-tab";
import { PegawaiTab } from "./pegawai-tab";
import { UnitKerjaTab } from "./unit-kerja-tab";

type Tab = "pegawai" | "unit" | "sub" | "jenis";
const TAB_SAH: Tab[] = ["pegawai", "unit", "sub", "jenis"];

export function MasterView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const nilai = searchParams.get("tab");
  const tab: Tab = nilai === "jenis-unit" ? "unit" : TAB_SAH.includes(nilai as Tab) ? (nilai as Tab) : "pegawai";
  const indukParam = Number(searchParams.get("induk"));
  const induk = Number.isInteger(indukParam) && indukParam > 0 ? indukParam : null;

  const pegawai = usePegawaiAdmin({ q: "", unit: null, aktif: null, page: 1 });
  const unit = useUnitKerjaAdmin();
  const jenis = useJenisAdmin();
  const jumlahUtama = unit.data?.filter((u) => u.parentId === null).length;
  const jumlahSub = unit.data?.filter((u) => u.parentId !== null).length;

  const buka = useCallback(
    (t: Tab, indukId?: number) => {
      const q = new URLSearchParams();
      if (t !== "pegawai") q.set("tab", t);
      if (indukId) q.set("induk", String(indukId));
      router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [router, pathname],
  );
  const lihatTurunan = useCallback((id: number) => buka("sub", id), [buka]);

  return (
    <>
      <PageHeader eyebrow="Administrasi" title="Master data" description="Kelola pegawai, unit kerja, dan jenis kegiatan." />
      <AdminGuard>
        <Panel>
          <div className="border-b border-muted px-4 pt-4 pb-3 md:px-5">
            <PilihanTab
              label="Jenis master data"
              value={tab}
              opsi={[
                { nilai: "pegawai", label: "Pegawai", jumlah: pegawai.data?.total },
                { nilai: "unit", label: "Unit kerja", jumlah: jumlahUtama },
                { nilai: "sub", label: "Sub bagian & seksi", jumlah: jumlahSub },
                { nilai: "jenis", label: "Jenis kegiatan", jumlah: jenis.data?.length },
              ]}
              onChange={(t) => buka(t)}
            />
          </div>
          {tab === "pegawai" && <PegawaiTab />}
          {tab === "unit" && <UnitKerjaTab tingkat="utama" onLihatTurunan={lihatTurunan} />}
          {tab === "sub" && <UnitKerjaTab key={induk ?? "semua"} tingkat="turunan" indukAwal={induk} />}
          {tab === "jenis" && <JenisTab />}
        </Panel>
      </AdminGuard>
    </>
  );
}
