"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { AdminGuard, PilihanTab } from "./admin-shared";
import { JenisTab } from "./jenis-tab";
import { PegawaiTab } from "./pegawai-tab";
import { BidangTab } from "./bidang-tab";

/**
 * Halaman master data bertab: pegawai, bidang, dan jenis kegiatan
 */

type Tab = "pegawai" | "unit" | "sub" | "jenis";
const TAB_SAH: Tab[] = ["pegawai", "unit", "sub", "jenis"];

export function MasterView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const nilai = searchParams.get("tab");
  const tab: Tab = TAB_SAH.includes(nilai as Tab) ? (nilai as Tab) : "pegawai";
  const indukParam = Number(searchParams.get("induk"));
  const induk = Number.isInteger(indukParam) && indukParam > 0 ? indukParam : null;

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
      <PageHeader eyebrow="Administrasi" title="Master data" />
      <AdminGuard>
        <Panel>
          <div className="border-b border-muted px-4 pt-4 pb-3 md:px-5">
            <PilihanTab
              label="Jenis master data"
              value={tab}
              opsi={[
                { nilai: "pegawai", label: "Pegawai" },
                { nilai: "unit", label: "Bidang" },
                { nilai: "sub", label: "Sub bidang" },
                { nilai: "jenis", label: "Jenis kegiatan" },
              ]}
              onChange={(t) => buka(t)}
            />
          </div>
          {tab === "pegawai" && <PegawaiTab />}
          {tab === "unit" && <BidangTab tingkat="utama" onLihatTurunan={lihatTurunan} />}
          {tab === "sub" && <BidangTab key={induk ?? "semua"} tingkat="turunan" indukAwal={induk} />}
          {tab === "jenis" && <JenisTab />}
        </Panel>
      </AdminGuard>
    </>
  );
}
