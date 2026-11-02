"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ZodError } from "zod";
import { createSession, destroySession, requireAdmin } from "@/lib/auth/session";
import { DUMMY_HASH, verifyPassword } from "@/lib/auth/password";
import { fromLocalInput } from "@/lib/datetime";
import { ApiError } from "@/lib/http";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { deleteImage, saveImage } from "@/lib/storage";
import {
  articleInputSchema,
  articlePatchSchema,
  galleryPatchSchema,
  loginSchema,
  uuidSchema,
} from "@/lib/validation";
import { findAdminByEmail } from "@/services/admins";
import { createArticle, deleteArticle, updateArticle } from "@/services/articles";
import { createGalleryImage, deleteGalleryImage, updateGalleryImage } from "@/services/gallery";

export interface FormState {
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
}

function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

function toast(path: string, notice: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}notice=${encodeURIComponent(notice)}`);
}

/** Only allow redirects back into the admin area. */
function safeNext(value: FormDataEntryValue | null): string {
  return typeof value === "string" && /^\/admin(\/|$|\?)/.test(value) && !value.startsWith("//") ? value : "/admin";
}

// ---------- auth ----------

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limitKey = `${ip}:${parsed.data.email}`;
  const limit = checkRateLimit(limitKey);
  if (!limit.allowed) {
    return { message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(limit.retryAfterSec / 60)} menit.` };
  }

  const admin = await findAdminByEmail(parsed.data.email);
  // Always hash-compare so response time does not reveal whether the email exists.
  const valid = await verifyPassword(parsed.data.password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !valid) return { message: "Email atau password salah." };

  resetRateLimit(limitKey);
  await createSession({ adminId: admin.id, email: admin.email });
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

// ---------- articles ----------

export async function saveArticleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const idRaw = formData.get("id");
  const id = typeof idRaw === "string" && idRaw ? uuidSchema.parse(idRaw) : undefined;
  const values = Object.fromEntries(
    ["title", "type", "excerpt", "content", "author", "status", "publishedAt"].map((k) => [
      k,
      String(formData.get(k) ?? ""),
    ]),
  );

  const raw = {
    title: formData.get("title"),
    type: formData.get("type"),
    excerpt: formData.get("excerpt"),
    content: formData.get("content"),
    author: formData.get("author") || undefined,
    status: formData.get("status"),
    publishedAt: fromLocalInput(formData.get("publishedAt")),
  };
  const parsed = (id ? articlePatchSchema.partial() : articleInputSchema).safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  let uploaded: string | undefined;
  try {
    const file = formData.get("thumbnail");
    if (file instanceof File && file.size > 0) uploaded = await saveImage(file, "articles");

    if (id) {
      const removeThumb = formData.get("removeThumbnail") === "on";
      await updateArticle(id, {
        ...(parsed.data as object),
        excerpt: values.excerpt?.trim() || null,
        ...(uploaded ? { thumbnailUrl: uploaded } : removeThumb ? { thumbnailUrl: null } : {}),
      });
    } else {
      await createArticle({ ...(parsed.data as Parameters<typeof createArticle>[0]), thumbnailUrl: uploaded });
    }
  } catch (error) {
    if (uploaded) await deleteImage(uploaded);
    if (error instanceof ApiError) {
      return { errors: error.status >= 413 && error.status <= 415 ? { thumbnail: error.message } : {}, message: error.message, values };
    }
    throw error;
  }

  toast("/admin/articles", id ? "Perubahan disimpan." : "Konten berhasil dibuat.");
}

export async function deleteArticleAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await deleteArticle(uuidSchema.parse(formData.get("id")));
  toast("/admin/articles", "Konten dihapus.");
}

// ---------- gallery ----------

export async function uploadGalleryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const alt = String(formData.get("alt") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();

  if (alt.length < 3) return { errors: { alt: "Deskripsi foto minimal 3 karakter" }, values: { alt, caption } };
  if (files.length === 0) return { errors: { files: "Pilih minimal satu foto" }, values: { alt, caption } };
  if (files.length > 10) return { errors: { files: "Maksimal 10 foto sekali unggah" }, values: { alt, caption } };

  const saved: string[] = [];
  try {
    for (const file of files) {
      const url = await saveImage(file, "gallery");
      saved.push(url);
      await createGalleryImage({ url, alt, caption: caption || undefined, sortOrder: 0 });
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        errors: { files: `${error.message}${saved.length ? ` (${saved.length} foto sudah tersimpan)` : ""}` },
        values: { alt, caption },
      };
    }
    throw error;
  }

  toast("/admin/gallery", `${saved.length} foto ditambahkan.`);
}

export async function updateGalleryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = uuidSchema.parse(formData.get("id"));
  const patch = galleryPatchSchema.safeParse({
    alt: formData.get("alt"),
    caption: formData.get("caption") ?? "",
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!patch.success) toast("/admin/gallery", `Gagal: ${patch.error.issues[0]?.message ?? "data tidak valid"}`);

  await updateGalleryImage(id, { ...patch.data, caption: patch.data.caption ?? undefined });
  toast("/admin/gallery", "Foto diperbarui.");
}

export async function deleteGalleryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await deleteGalleryImage(uuidSchema.parse(formData.get("id")));
  toast("/admin/gallery", "Foto dihapus.");
}
