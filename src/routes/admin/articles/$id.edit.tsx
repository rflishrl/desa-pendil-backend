import { createFileRoute } from "@tanstack/react-router";

import { ArticleEditView } from "@/features/articles/components/article-edit-view";

export const Route = createFileRoute("/admin/articles/$id/edit")({
  head: () => ({
    meta: [{ title: "Ubah Konten | Panel Admin Desa Pendil" }],
  }),
  component: ArticleEditComponent,
});

function ArticleEditComponent() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-6">
      <ArticleEditView id={id} />
    </div>
  );
}
