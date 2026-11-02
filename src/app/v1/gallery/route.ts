import { handle, json, preflight, withCors } from "@/lib/http";
import { listGallery, toGalleryDto } from "@/services/gallery";

export const dynamic = "force-dynamic";

/** GET /v1/gallery — { data: [{ id, src, alt, caption }] } for the public "Galeri Desa". */
export function GET(request: Request) {
  return handle(async () => {
    const rows = await listGallery();
    const response = json({ data: rows.map(toGalleryDto) });
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return withCors(request, response);
  });
}

export const OPTIONS = preflight;
