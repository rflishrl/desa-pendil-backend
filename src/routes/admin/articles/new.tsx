import { createFileRoute } from "@tanstack/react-router";

import { PageHeading } from "@/components/admin-kit/page-heading";
import { ArticleForm } from "@/features/articles/components/article-form";

export const Route = createFileRoute("/admin/articles/new")({
  head: () => ({
    meta: [{ title: "Tambah Konten | Panel Admin Desa Pendil" }],
  }),
  component: ArticleCreateComponent,
});

function ArticleCreateComponent() {
  return (
    <div className="space-y-6">
      <PageHeading title="Tambah konten" />
      <ArticleForm />
    </div>
  );
}
