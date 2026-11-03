import "server-only";

import type {
  GalleryCreateInput,
  GalleryDto,
  GalleryUpdateInput,
} from "@/features/gallery/schemas";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type GalleryRow = Tables<"gallery_images">;

function toDto(row: GalleryRow): GalleryDto {
  return {
    id: row.id,
    url: row.url,
    alt: row.alt,
    caption: row.caption,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/** Input -> kolom snake_case. Keterangan kosong disimpan sebagai NULL. */
function toColumns(input: GalleryUpdateInput) {
  return {
    ...(input.url !== undefined && { url: input.url }),
    ...(input.alt !== undefined && { alt: input.alt }),
    ...(input.caption !== undefined && { caption: input.caption || null }),
    ...(input.sort_order !== undefined && { sort_order: input.sort_order }),
  };
}

/** Urutan kecil lebih dulu; jika sama, yang terbaru dulu. */
export async function listGalleryImages(
  supabase: AppSupabaseClient,
  { limit, offset }: { limit: number; offset: number },
): Promise<{ items: GalleryDto[]; total: number }> {
  const { data, error, count } = await supabase
    .from("gallery_images")
    .select("*", { count: "exact" })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw toAppError(error, "memuat galeri");
  return { items: data.map(toDto), total: count ?? 0 };
}

export async function countGalleryImages(
  supabase: AppSupabaseClient,
): Promise<number> {
  const { count, error } = await supabase
    .from("gallery_images")
    .select("id", { count: "exact", head: true });
  if (error) throw toAppError(error, "menghitung galeri");
  return count ?? 0;
}

export async function findGalleryImage(
  supabase: AppSupabaseClient,
  id: string,
): Promise<GalleryDto | null> {
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw toAppError(error, "memuat foto");
  return data ? toDto(data) : null;
}

export async function insertGalleryImage(
  supabase: AppSupabaseClient,
  input: GalleryCreateInput,
): Promise<GalleryDto> {
  const { data, error } = await supabase
    .from("gallery_images")
    .insert({ ...toColumns(input), url: input.url, alt: input.alt })
    .select("*")
    .single();
  if (error) throw toAppError(error, "menyimpan foto");
  return toDto(data);
}

export async function updateGalleryImage(
  supabase: AppSupabaseClient,
  id: string,
  input: GalleryUpdateInput,
): Promise<GalleryDto | null> {
  const { data, error } = await supabase
    .from("gallery_images")
    .update(toColumns(input))
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw toAppError(error, "menyimpan perubahan");
  return data ? toDto(data) : null;
}

export async function deleteGalleryImage(
  supabase: AppSupabaseClient,
  id: string,
): Promise<GalleryDto | null> {
  const { data, error } = await supabase
    .from("gallery_images")
    .delete()
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw toAppError(error, "menghapus foto");
  return data ? toDto(data) : null;
}
