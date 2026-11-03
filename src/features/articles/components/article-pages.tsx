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
import { createSessionClient } from "@/lib/supabase/server";

type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (raw: RawSearchParams) =>
  Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );

/** Daftar: service dipanggil langsung di server, hasilnya dihidrasi ke TanStack Query. */
export async function ArticleListPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const query = listQuerySchema(10).parse(first(await searchParams));
  const params = { q: query.q ?? "", page: query.page };

  const [supabase, actor] = await Promise.all([
    createSessionClient(),
    getCurrentAdmin(),
  ]);
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    ...articleListOptions(params),
    queryFn: () =>
      listArticlesFor(supabase, { audience: "admin", actor }, params),
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

/** Tambah: tanpa data awal, tanpa prefetch. */
export function ArticleCreatePage() {
  return (
    <>
      <PageHeading title="Tambah konten" />
      <ArticleForm />
    </>
  );
}

/** Ubah: data di-prefetch supaya form langsung terisi; id tidak ada = 404. */
export async function ArticleEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [supabase, actor] = await Promise.all([
    createSessionClient(),
    getCurrentAdmin(),
  ]);
  const queryClient = getQueryClient();

  try {
    await queryClient.fetchQuery({
      ...articleDetailOptions(id),
      queryFn: () => getArticle(supabase, { audience: "admin", actor }, id),
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
