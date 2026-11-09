import { createFileRoute } from "@tanstack/react-router";

import { uploadPhoto } from "@/features/uploads/service";
import { AppError } from "@/lib/api/errors";
import { withApi } from "@/lib/api/with-api";

const handlePost = withApi({ access: "admin" }, async ({ request, actor }) => {
  const form = await request.formData().catch(() => {
    throw new AppError("BAD_REQUEST", "Body must be multipart/form-data.");
  });
  return { data: await uploadPhoto(actor, form), status: 201 };
});

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: handlePost,
    },
  },
});

export { handlePost as POST };
