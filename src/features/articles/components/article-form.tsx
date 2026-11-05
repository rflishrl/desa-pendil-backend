"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";

import { ImageField } from "@/components/admin-kit/image-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSaveArticle } from "@/features/articles/hooks";
import { ARTICLES_ADMIN_PATH } from "@/features/articles/queries";
import {
  ARTICLE_STATUS_LABELS,
  ARTICLE_STATUSES,
  ARTICLE_TYPE_LABELS,
  ARTICLE_TYPES,
  articleCreateSchema,
  type ArticleDto,
  type ArticleFormValues,
} from "@/features/articles/schemas";

const Required = () => (
  <span aria-hidden="true" className="text-destructive">
    *
  </span>
);

const SELECT_CLASS =
  "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50";

/** Article create and edit form sharing validation schemas with API routes. */
export function ArticleForm({ article }: { article?: ArticleDto }) {
  const save = useSaveArticle(article?.id);
  const alertRef = useRef<HTMLDivElement>(null);
  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleCreateSchema),
    defaultValues: {
      title: article?.title ?? "",
      type: article?.type ?? "berita",
      excerpt: article?.excerpt ?? "",
      content: article?.content ?? "",
      thumbnail_url: article?.thumbnail ?? "",
      author: article?.author ?? "Admin",
      status: article?.status ?? "draft",
    },
  });

  useEffect(() => {
    if (save.error) alertRef.current?.focus();
  }, [save.error]);

  const busy = save.isPending || save.isSuccess;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => save.mutate(values))}
      className="space-y-6"
    >
      {save.error && (
        <Alert variant="destructive" ref={alertRef} tabIndex={-1}>
          <AlertCircleIcon aria-hidden="true" />
          <AlertDescription>{save.error.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <FieldGroup className="rounded-lg bg-card p-5 shadow-card sm:p-6">
          <Controller
            name="title"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="article-title">
                  Judul <Required />
                </FieldLabel>
                <Input
                  {...field}
                  id="article-title"
                  maxLength={200}
                  autoComplete="off"
                  required
                  aria-invalid={fieldState.invalid}
                  aria-describedby="article-title-error"
                  className="h-11 bg-card"
                />
                {fieldState.invalid && (
                  <FieldError
                    id="article-title-error"
                    errors={[fieldState.error]}
                  />
                )}
              </Field>
            )}
          />

          <Controller
            name="excerpt"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="article-excerpt">Ringkasan</FieldLabel>
                <Textarea
                  {...field}
                  id="article-excerpt"
                  rows={2}
                  maxLength={300}
                  aria-invalid={fieldState.invalid}
                  aria-describedby="article-excerpt-error"
                  className="bg-card"
                />
                {fieldState.invalid && (
                  <FieldError
                    id="article-excerpt-error"
                    errors={[fieldState.error]}
                  />
                )}
              </Field>
            )}
          />

          <Controller
            name="content"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="article-content">
                  Isi <Required />
                </FieldLabel>
                <Textarea
                  {...field}
                  id="article-content"
                  rows={14}
                  maxLength={50000}
                  required
                  aria-invalid={fieldState.invalid}
                  aria-describedby="article-content-error"
                  className="bg-card"
                />
                {fieldState.invalid && (
                  <FieldError
                    id="article-content-error"
                    errors={[fieldState.error]}
                  />
                )}
              </Field>
            )}
          />
        </FieldGroup>

        <div className="space-y-6">
          <FieldGroup className="rounded-lg bg-card p-5 shadow-card sm:p-6">
            <Controller
              name="type"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="article-type">Jenis</FieldLabel>
                  <select
                    {...field}
                    id="article-type"
                    className={SELECT_CLASS}
                    aria-describedby="article-type-hint"
                  >
                    {ARTICLE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {ARTICLE_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                  <FieldDescription id="article-type-hint">
                    Hanya berita yang tampil di halaman Berita website.
                  </FieldDescription>
                </Field>
              )}
            />

            <Controller
              name="status"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="article-status">Status</FieldLabel>
                  <select
                    {...field}
                    id="article-status"
                    className={SELECT_CLASS}
                    aria-describedby="article-status-hint"
                  >
                    {ARTICLE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {ARTICLE_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                  <FieldDescription id="article-status-hint">
                    Draf tidak muncul di API publik.
                  </FieldDescription>
                </Field>
              )}
            />

            <Controller
              name="author"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="article-author">
                    Penulis <Required />
                  </FieldLabel>
                  <Input
                    {...field}
                    id="article-author"
                    maxLength={80}
                    required
                    aria-invalid={fieldState.invalid}
                    aria-describedby="article-author-error"
                    className="h-11 bg-card"
                  />
                  {fieldState.invalid && (
                    <FieldError
                      id="article-author-error"
                      errors={[fieldState.error]}
                    />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          <div className="rounded-lg bg-card p-5 shadow-card sm:p-6">
            <Controller
              name="thumbnail_url"
              control={form.control}
              render={({ field, fieldState }) => (
                <ImageField
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  folder="articles"
                  error={fieldState.error?.message}
                />
              )}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" size="lg" className="h-11 px-4">
          <Link href={ARTICLES_ADMIN_PATH}>Batal</Link>
        </Button>
        <Button type="submit" size="lg" className="h-11 px-4" disabled={busy}>
          {busy
            ? "Menyimpan..."
            : article
              ? "Simpan perubahan"
              : "Tambah konten"}
        </Button>
      </div>
    </form>
  );
}
