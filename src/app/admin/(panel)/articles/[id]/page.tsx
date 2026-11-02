import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { toLocalInput } from "@/lib/datetime";
import { uuidSchema } from "@/lib/validation";
import { findArticle } from "@/services/articles";

export const metadata: Metadata = { title: "Edit konten" };
export const dynamic = "force-dynamic";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const parsed = uuidSchema.safeParse((await params).id);
  if (!parsed.success) notFound();

  const article = await findArticle(parsed.data);
  if (!article) notFound();

  return (
    <>
      <PageHeader title="Edit konten" description={article.title} />
      <ArticleForm
        initial={{
          id: article.id,
          title: article.title,
          type: article.type,
          excerpt: article.excerpt ?? "",
          content: article.content,
          author: article.author,
          status: article.status,
          publishedAt: toLocalInput(article.publishedAt),
          thumbnailUrl: article.thumbnailUrl,
        }}
      />
    </>
  );
}
