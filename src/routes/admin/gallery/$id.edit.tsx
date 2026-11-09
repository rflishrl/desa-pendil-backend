import { createFileRoute } from "@tanstack/react-router";

import { GalleryEditView } from "@/features/gallery/components/gallery-edit-view";

export const Route = createFileRoute("/admin/gallery/$id/edit")({
  head: () => ({
    meta: [{ title: "Ubah Foto | Panel Admin Desa Pendil" }],
  }),
  component: GalleryEditComponent,
});

function GalleryEditComponent() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-6">
      <GalleryEditView id={id} />
    </div>
  );
}
