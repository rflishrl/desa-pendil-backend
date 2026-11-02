import { readLocalImage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Serves locally stored uploads (development and the Docker volume). Vercel Blob URLs bypass this. */
export async function GET(_request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const file = await readLocalImage(path.join("/"));
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.contentType,
      // File names are random UUIDs, so they never change.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
