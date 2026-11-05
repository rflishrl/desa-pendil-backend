import type { Metadata } from "next";

import { ArticleCreatePage } from "@/features/articles/components/article-pages";

export const metadata: Metadata = { title: "Tambah Konten" };

export default function Page() {
  return <ArticleCreatePage />;
}
