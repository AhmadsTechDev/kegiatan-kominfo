import type { Metadata } from "next";
import { KegiatanDetailView } from "@/features/kegiatan/components/kegiatan-detail-view";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Detail kegiatan" };

export default async function KegiatanDetailPage({ params }: Props) {
  const { id } = await params;
  return <KegiatanDetailView id={Number(id)} />;
}
