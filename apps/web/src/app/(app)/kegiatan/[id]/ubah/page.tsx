import type { Metadata } from "next";
import { KegiatanUbahView } from "@/features/kegiatan/components/kegiatan-form-view";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Ubah kegiatan" };

export default async function KegiatanUbahPage({ params }: Props) {
  const { id } = await params;
  return <KegiatanUbahView id={Number(id)} />;
}
