"use client";

import { AlertCircleIcon } from "lucide-react";

import { ListSkeleton } from "@/components/admin-kit/list-skeleton";
import { PageHeading } from "@/components/admin-kit/page-heading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GalleryForm } from "@/features/gallery/components/gallery-form";
import { useGalleryImage } from "@/features/gallery/hooks";

export function GalleryEditView({ id }: { id: string }) {
  const { data, error, isPending } = useGalleryImage(id);

  if (isPending) return <ListSkeleton rows={3} />;
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" />
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <PageHeading title="Ubah foto" description={data.alt} />
      <GalleryForm key={data.updatedAt} image={data} />
    </>
  );
}
