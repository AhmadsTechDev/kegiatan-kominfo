import type { Metadata } from "next";
import { AkunDetailView } from "@/features/admin/components/akun-detail-view";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Detail akun" };

export default async function AkunDetailPage({ params }: Props) {
  const { id } = await params;
  return <AkunDetailView id={id} />;
}
