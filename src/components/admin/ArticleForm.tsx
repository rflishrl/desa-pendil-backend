"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveArticleAction, type FormState } from "@/app/admin/actions";
import { ImageField } from "@/components/admin/ImageField";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { btn, Field, inputCls, Notice } from "@/components/admin/ui";

export interface ArticleFormValues {
  id?: string;
  title: string;
  type: "berita" | "artikel" | "postingan";
  excerpt: string;
  content: string;
  author: string;
  status: "draft" | "published";
  publishedAt: string; // datetime-local, Jakarta time
  thumbnailUrl: string | null;
}

export function ArticleForm({ initial }: { initial: ArticleFormValues }) {
  const [state, action] = useActionState<FormState, FormData>(saveArticleAction, {});
  const v = { ...initial, ...state.values };
  const err = state.errors ?? {};
  const invalid = (k: string) => (err[k] ? true : undefined);
  const describe = (k: string, hint = false) =>
    err[k] ? `${k}-error` : hint ? `${k}-hint` : undefined;

  return (
    <form action={action} className="space-y-6" noValidate>
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {state.message ? <Notice tone="error">{state.message}</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6 rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <Field label="Judul" htmlFor="title" error={err.title} required>
            <input
              id="title"
              name="title"
              defaultValue={v.title}
              maxLength={200}
              required
              aria-invalid={invalid("title")}
              aria-describedby={describe("title")}
              className={inputCls}
            />
          </Field>
          <Field
            label="Ringkasan"
            htmlFor="excerpt"
            hint="Opsional. Tampil sebagai pratinjau singkat (maks. 300 karakter)."
            error={err.excerpt}
          >
            <textarea
              id="excerpt"
              name="excerpt"
              rows={2}
              maxLength={300}
              defaultValue={v.excerpt}
              aria-invalid={invalid("excerpt")}
              aria-describedby={describe("excerpt", true)}
              className={inputCls}
            />
          </Field>
          <Field label="Isi" htmlFor="content" error={err.content} hint="Pisahkan paragraf dengan satu baris kosong." required>
            <textarea
              id="content"
              name="content"
              rows={14}
              required
              defaultValue={v.content}
              aria-invalid={invalid("content")}
              aria-describedby={describe("content", true)}
              className={`${inputCls} leading-relaxed`}
            />
          </Field>
        </div>

        <aside className="space-y-6 rounded-2xl bg-white p-5 shadow-card sm:p-6 lg:self-start">
          <Field label="Jenis" htmlFor="type" required>
            <select id="type" name="type" defaultValue={v.type} className={inputCls}>
              <option value="berita">Berita</option>
              <option value="artikel">Artikel</option>
              <option value="postingan">Postingan</option>
            </select>
          </Field>
          <Field label="Status" htmlFor="status" hint="Draf tidak tampil di website." required>
            <select id="status" name="status" defaultValue={v.status} className={inputCls}>
              <option value="draft">Draf</option>
              <option value="published">Terbit</option>
            </select>
          </Field>
          <Field
            label="Waktu terbit (WIB)"
            htmlFor="publishedAt"
            hint="Kosongkan untuk terbit sekarang. Isi tanggal depan untuk menjadwalkan."
            error={err.publishedAt}
          >
            <input
              id="publishedAt"
              name="publishedAt"
              type="datetime-local"
              defaultValue={v.publishedAt}
              aria-invalid={invalid("publishedAt")}
              aria-describedby={describe("publishedAt", true)}
              className={inputCls}
            />
          </Field>
          <Field label="Penulis" htmlFor="author" error={err.author}>
            <input id="author" name="author" defaultValue={v.author} maxLength={80} className={inputCls} />
          </Field>
          <ImageField
            name="thumbnail"
            label="Gambar utama"
            existingUrl={initial.thumbnailUrl}
            removeName="removeThumbnail"
            serverError={err.thumbnail}
          />
        </aside>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <Link href="/admin/articles" className={btn.secondary}>
          Batal
        </Link>
        <SubmitButton>{initial.id ? "Simpan perubahan" : "Simpan konten"}</SubmitButton>
      </div>
    </form>
  );
}
