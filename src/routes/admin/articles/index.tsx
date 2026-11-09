import { createFileRoute, Link } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { z } from "zod";

import { PageHeading } from "@/components/admin-kit/page-heading";
import { SearchForm } from "@/components/admin-kit/search-form";
import { Button } from "@/components/ui/button";
import { ArticleListView } from "@/features/articles/components/article-list-view";
import { ARTICLES_ADMIN_PATH } from "@/features/articles/queries";

const searchSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
});

export const Route = createFileRoute("/admin/articles/")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Konten | Panel Admin Desa Pendil" }],
  }),
  component: ArticleListComponent,
});

function ArticleListComponent() {
  const { q, page } = Route.useSearch();
  const params = { q: q ?? "", page: page ?? 1 };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Konten"
        description="Kelola berita, artikel, dan postingan Desa Pendil."
        action={
          <Button asChild size="lg" className="h-11 px-4">
            <Link to={`${ARTICLES_ADMIN_PATH}/new`}>
              <PlusIcon aria-hidden="true" />
              Tambah konten
            </Link>
          </Button>
        }
      />
      <SearchForm
        defaultValue={params.q}
        placeholder="Cari judul..."
        clearHref={ARTICLES_ADMIN_PATH}
      />
      <ArticleListView params={params} />
    </div>
  );
}
