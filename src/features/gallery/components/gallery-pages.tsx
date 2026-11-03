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
import {
  getGalleryImage,
  listGalleryFor,
} from "@/features/gallery/service";
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
export async function GalleryListPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const query = listQuerySchema(12).parse(first(await searchParams));
  const params = { page: query.page };

  const [supabase, actor] = await Promise.all([
    createSessionClient(),
    getCurrentAdmin(),
  ]);
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    ...galleryListOptions(params),
    queryFn: () =>
      listGalleryFor(supabase, { audience: "admin", actor }, params),
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

/** Ubah: data di-prefetch supaya form langsung terisi; id tidak ada = 404. */
export async function GalleryEditPage({
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
      ...galleryDetailOptions(id),
      queryFn: () => getGalleryImage(supabase, actor, id),
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
