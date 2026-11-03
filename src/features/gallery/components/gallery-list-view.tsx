"use client";

import { AlertCircleIcon, ImagesIcon, PencilIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { DeleteDialog } from "@/components/admin-kit/delete-dialog";
import { ListSkeleton } from "@/components/admin-kit/list-skeleton";
import { PaginationNav } from "@/components/admin-kit/pagination-nav";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  useDeleteGalleryImage,
  useGalleryList,
} from "@/features/gallery/hooks";
import {
  GALLERY_ADMIN_PATH,
  type GalleryListParams,
} from "@/features/gallery/queries";
import type { GalleryDto } from "@/features/gallery/schemas";

function PhotoCard({ image }: { image: GalleryDto }) {
  const remove = useDeleteGalleryImage();
  return (
    <li className="overflow-hidden rounded-lg bg-card shadow-card">
      {/* <img> biasa: pratinjau admin tidak perlu dioptimasi next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.alt}
        width={400}
        height={300}
        loading="lazy"
        decoding="async"
        className="aspect-4/3 w-full bg-muted object-cover"
      />
      <div className="space-y-1 p-4">
        <p className="line-clamp-2 font-semibold">{image.alt}</p>
        {image.caption && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {image.caption}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Urutan {image.sortOrder}
        </p>
      </div>
      <div className="flex justify-end gap-1 border-t px-2 py-2">
        <Button asChild variant="ghost" size="lg" className="h-11 px-3">
          <Link
            href={`${GALLERY_ADMIN_PATH}/${image.id}/edit`}
            aria-label={`Ubah ${image.alt}`}
          >
            <PencilIcon aria-hidden="true" />
            Ubah
          </Link>
        </Button>
        <DeleteDialog
          itemName={image.alt}
          onConfirm={() => remove.mutateAsync(image.id)}
        />
      </div>
    </li>
  );
}

export function GalleryListView({ params }: { params: GalleryListParams }) {
  const { data, error, isPending, isFetching, refetch } =
    useGalleryList(params);

  if (isPending) return <ListSkeleton />;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" />
        <AlertTitle>Data gagal dimuat</AlertTitle>
        <AlertDescription>
          <p>{error.message}</p>
          <Button
            variant="outline"
            className="mt-2 h-11"
            onClick={() => refetch()}
          >
            Coba lagi
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (data.items.length === 0) {
    return (
      <Empty className="border border-dashed bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ImagesIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Belum ada foto</EmptyTitle>
          <EmptyDescription>
            Tambahkan foto pertama agar tampil di Galeri Desa.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild size="lg" className="h-11 px-4">
            <Link href={`${GALLERY_ADMIN_PATH}/new`}>
              <PlusIcon aria-hidden="true" />
              Tambah foto
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div aria-busy={isFetching}>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.items.map((image) => (
          <PhotoCard key={image.id} image={image} />
        ))}
      </ul>
      <PaginationNav
        pagination={data.pagination}
        basePath={GALLERY_ADMIN_PATH}
        q=""
      />
    </div>
  );
}
