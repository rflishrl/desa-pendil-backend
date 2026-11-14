import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { PageHeading } from "@/components/admin-kit/page-heading";
import { MediaStorageDashboard } from "@/features/uploads/components/MediaStorageDashboard";

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().catch(1),
});

export const Route = createFileRoute("/admin/storage")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Penyimpanan Media | Panel Admin Desa Pendil" }],
  }),
  component: StorageMonitorPage,
});

function StorageMonitorPage() {
  const { page } = Route.useSearch();

  return (
    <div className="space-y-6">
      <PageHeading
        title="Penyimpanan Media R2"
        description="Pantau pemakaian kuota, komposisi gambar WebP, dan status aset media aplikasi dari database."
      />
      <MediaStorageDashboard page={page ?? 1} />
    </div>
  );
}
