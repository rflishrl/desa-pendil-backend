import type { Metadata } from "next";

import { GalleryListPage } from "@/features/gallery/components/gallery-pages";

export const metadata: Metadata = { title: "Galeri" };

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <GalleryListPage searchParams={searchParams} />;
}
