import { requireAdminApi } from "@/lib/auth/session";
import { handle, json } from "@/lib/http";
import { galleryPatchSchema, uuidSchema } from "@/lib/validation";
import { deleteGalleryImage, toGalleryDto, updateGalleryImage } from "@/services/gallery";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export function PATCH(request: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdminApi();
    const id = uuidSchema.parse((await ctx.params).id);
    const patch = galleryPatchSchema.parse(await request.json().catch(() => null));
    return json({ data: toGalleryDto(await updateGalleryImage(id, patch)) });
  });
}

export function DELETE(_request: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdminApi();
    const id = uuidSchema.parse((await ctx.params).id);
    await deleteGalleryImage(id);
    return new Response(null, { status: 204 });
  });
}
