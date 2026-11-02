import type { Metadata } from "next";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Konten baru" };

export default async function NewArticlePage() {
  const session = await requireAdmin();
  return (
    <>
      <PageHeader title="Konten baru" description="Tulis berita, artikel, atau postingan." />
      <ArticleForm
        initial={{
          title: "",
          type: "berita",
          excerpt: "",
          content: "",
          author: session.email.split("@")[0] ?? "Admin",
          status: "draft",
          publishedAt: "",
          thumbnailUrl: null,
        }}
      />
    </>
  );
}
