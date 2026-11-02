import { requireAdminApi } from "@/lib/auth/session";
import { handle, json, preflight, withCors } from "@/lib/http";
import { galleryInputSchema } from "@/lib/validation";
import { createGalleryImage, listGallery, toGalleryDto } from "@/services/gallery";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handle(async () => {
    const rows = await listGallery();
    return withCors(request, json({ data: rows.map(toGalleryDto) }));
  });
}

/** POST /api/v1/gallery — register an already-uploaded image ({ url, alt, caption?, sortOrder? }). */
export function POST(request: Request) {
  return handle(async () => {
    await requireAdminApi();
    const body = galleryInputSchema.parse(await request.json().catch(() => null));
    return json({ data: toGalleryDto(await createGalleryImage(body)) }, { status: 201 });
  });
}

export const OPTIONS = preflight;
