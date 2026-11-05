import type { Metadata } from "next";

import { ArticleEditPage } from "@/features/articles/components/article-pages";

export const metadata: Metadata = { title: "Ubah Konten" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ArticleEditPage params={params} />;
}
