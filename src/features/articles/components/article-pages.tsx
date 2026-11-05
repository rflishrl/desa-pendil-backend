import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeading } from "@/components/admin-kit/page-heading";
import { SearchForm } from "@/components/admin-kit/search-form";
import { Button } from "@/components/ui/button";
import { ArticleEditView } from "@/features/articles/components/article-edit-view";
import { ArticleForm } from "@/features/articles/components/article-form";
import { ArticleListView } from "@/features/articles/components/article-list-view";
import {
  ARTICLES_ADMIN_PATH,
  articleDetailOptions,
  articleListOptions,
} from "@/features/articles/queries";
import { getArticle, listArticlesFor } from "@/features/articles/service";
import { AppError } from "@/lib/api/errors";
import { getCurrentAdmin } from "@/lib/auth/session";
import { getQueryClient } from "@/lib/query/query-client";
import { listQuerySchema } from "@/lib/schemas/common";

type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (raw: RawSearchParams) =>
  Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );

/** List view: calls service directly on server and hydrates TanStack Query cache. */
export async function ArticleListPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const query = listQuerySchema(10).parse(first(await searchParams));
  const params = { q: query.q ?? "", page: query.page };

  const actor = await getCurrentAdmin();
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    ...articleListOptions(params),
    queryFn: () => listArticlesFor({ audience: "admin", actor }, params),
  });

  return (
    <>
      <PageHeading
        title="Konten"
        description="Kelola berita, artikel, dan postingan Desa Pendil."
        action={
          <Button asChild size="lg" className="h-11 px-4">
            <Link href={`${ARTICLES_ADMIN_PATH}/new`}>
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
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ArticleListView params={params} />
      </HydrationBoundary>
    </>
  );
}

/** Create view: no initial data required. */
export function ArticleCreatePage() {
  return (
    <>
      <PageHeading title="Tambah konten" />
      <ArticleForm />
    </>
  );
}

/** Edit view: prefetches data to prefill form; returns 404 if record is missing. */
export async function ArticleEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getCurrentAdmin();
  const queryClient = getQueryClient();

  try {
    await queryClient.fetchQuery({
      ...articleDetailOptions(id),
      queryFn: () => getArticle({ audience: "admin", actor }, id),
    });
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ArticleEditView id={id} />
    </HydrationBoundary>
  );
}
