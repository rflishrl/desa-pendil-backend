import { createFileRoute, Link } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { z } from "zod";

import { PageHeading } from "@/components/admin-kit/page-heading";
import { Button } from "@/components/ui/button";
import { GalleryListView } from "@/features/gallery/components/gallery-list-view";
import { GALLERY_ADMIN_PATH } from "@/features/gallery/queries";

const searchSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
});

export const Route = createFileRoute("/admin/gallery/")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Galeri | Panel Admin Desa Pendil" }],
  }),
  component: GalleryListComponent,
});

function GalleryListComponent() {
  const { page } = Route.useSearch();
  const params = { page: page ?? 1 };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Galeri"
        description="Kelola foto yang tampil di Galeri Desa."
        action={
          <Button asChild size="lg" className="h-11 px-4">
            <Link to={`${GALLERY_ADMIN_PATH}/new`}>
              <PlusIcon aria-hidden="true" />
              Unggah foto
            </Link>
          </Button>
        }
      />
      <GalleryListView params={params} />
    </div>
  );
}
