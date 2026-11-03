import { uploadPhoto } from "@/features/uploads/service";
import { AppError } from "@/lib/api/errors";
import { withApi } from "@/lib/api/with-api";

export const maxDuration = 30;

/** Admin: unggah satu foto (multipart/form-data: `file`, `folder`), balas URL publiknya. */
export const POST = withApi({ access: "admin" }, async ({ request, actor }) => {
  const form = await request.formData().catch(() => {
    throw new AppError("BAD_REQUEST", "Body harus berupa multipart/form-data.");
  });
  return { data: await uploadPhoto(actor, form), status: 201 };
});
