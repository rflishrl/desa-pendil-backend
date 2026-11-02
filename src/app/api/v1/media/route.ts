import { requireAdminApi } from "@/lib/auth/session";
import { ApiError, handle, json } from "@/lib/http";
import { saveImage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/media  (multipart/form-data: file, folder = articles | gallery)
 * Returns { data: { url } }. Max 4 MB; JPG/PNG/WebP only (checked by file signature).
 */
export function POST(request: Request) {
  return handle(async () => {
    await requireAdminApi();
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) throw new ApiError(422, "Field 'file' is required");

    const folder = form?.get("folder") === "articles" ? "articles" : "gallery";
    return json({ data: { url: await saveImage(file, folder) } }, { status: 201 });
  });
}
