import type { Metadata } from "next";

import { GalleryEditPage } from "@/features/gallery/components/gallery-pages";

export const metadata: Metadata = { title: "Ubah Foto" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <GalleryEditPage params={params} />;
}
