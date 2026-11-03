import type { Metadata } from "next";

import { GalleryCreatePage } from "@/features/gallery/components/gallery-pages";

export const metadata: Metadata = { title: "Tambah Foto" };

export default function Page() {
  return <GalleryCreatePage />;
}
