import type { Metadata } from "next";

import { ArticleListPage } from "@/features/articles/components/article-pages";

export const metadata: Metadata = { title: "Konten" };

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ArticleListPage searchParams={searchParams} />;
}
