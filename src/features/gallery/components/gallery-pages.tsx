import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeading } from "@/components/admin-kit/page-heading";
import { Button } from "@/components/ui/button";
import { GalleryEditView } from "@/features/gallery/components/gallery-edit-view";
import { GalleryForm } from "@/features/gallery/components/gallery-form";
import { GalleryListView } from "@/features/gallery/components/gallery-list-view";
import {
  GALLERY_ADMIN_PATH,
  galleryDetailOptions,
  galleryListOptions,
} from "@/features/gallery/queries";
import { getGalleryImage, listGalleryFor } from "@/features/gallery/service";
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
export async function GalleryListPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const query = listQuerySchema(12).parse(first(await searchParams));
  const params = { page: query.page };

  const actor = await getCurrentAdmin();
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    ...galleryListOptions(params),
    queryFn: () => listGalleryFor({ audience: "admin", actor }, params),
  });

  return (
    <>
      <PageHeading
        title="Galeri"
        description="Kelola foto yang tampil di Galeri Desa."
        action={
          <Button asChild size="lg" className="h-11 px-4">
            <Link href={`${GALLERY_ADMIN_PATH}/new`}>
              <PlusIcon aria-hidden="true" />
              Tambah foto
            </Link>
          </Button>
        }
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <GalleryListView params={params} />
      </HydrationBoundary>
    </>
  );
}

export function GalleryCreatePage() {
  return (
    <>
      <PageHeading title="Tambah foto" />
      <GalleryForm />
    </>
  );
}

/** Edit view: prefetches data to prefill form; returns 404 if record is missing. */
export async function GalleryEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getCurrentAdmin();
  const queryClient = getQueryClient();

  try {
    await queryClient.fetchQuery({
      ...galleryDetailOptions(id),
      queryFn: () => getGalleryImage(actor, id),
    });
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GalleryEditView id={id} />
    </HydrationBoundary>
  );
}
