import { createFileRoute } from "@tanstack/react-router";

import { PageHeading } from "@/components/admin-kit/page-heading";
import { GalleryForm } from "@/features/gallery/components/gallery-form";

export const Route = createFileRoute("/admin/gallery/new")({
  head: () => ({
    meta: [{ title: "Unggah Foto | Panel Admin Desa Pendil" }],
  }),
  component: GalleryCreateComponent,
});

function GalleryCreateComponent() {
  return (
    <div className="space-y-6">
      <PageHeading title="Unggah foto" />
      <GalleryForm />
    </div>
  );
}
