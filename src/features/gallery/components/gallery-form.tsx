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
import { useSaveGalleryImage } from "@/features/gallery/hooks";
import { GALLERY_ADMIN_PATH } from "@/features/gallery/queries";
import {
  galleryCreateSchema,
  type GalleryDto,
  type GalleryFormValues,
} from "@/features/gallery/schemas";

const Required = () => (
  <span aria-hidden="true" className="text-destructive">
    *
  </span>
);

/** Gallery create and edit form sharing validation schemas with API routes. */
export function GalleryForm({ image }: { image?: GalleryDto }) {
  const save = useSaveGalleryImage(image?.id);
  const alertRef = useRef<HTMLDivElement>(null);
  const form = useForm<GalleryFormValues>({
    resolver: zodResolver(galleryCreateSchema),
    defaultValues: {
      url: image?.url ?? "",
      alt: image?.alt ?? "",
      caption: image?.caption ?? "",
      sort_order: image ? String(image.sortOrder) : "0",
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <FieldGroup className="rounded-lg bg-card p-5 shadow-card sm:p-6">
          <Controller
            name="alt"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="gallery-alt">
                  Teks alternatif <Required />
                </FieldLabel>
                <Input
                  {...field}
                  id="gallery-alt"
                  maxLength={200}
                  autoComplete="off"
                  required
                  aria-invalid={fieldState.invalid}
                  aria-describedby="gallery-alt-hint gallery-alt-error"
                  className="h-11 bg-card"
                />
                <FieldDescription id="gallery-alt-hint">
                  Jelaskan isi foto dalam satu kalimat, untuk pembaca layar.
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError
                    id="gallery-alt-error"
                    errors={[fieldState.error]}
                  />
                )}
              </Field>
            )}
          />

          <Controller
            name="caption"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="gallery-caption">Keterangan</FieldLabel>
                <Input
                  {...field}
                  id="gallery-caption"
                  maxLength={300}
                  aria-invalid={fieldState.invalid}
                  aria-describedby="gallery-caption-error"
                  className="h-11 bg-card"
                />
                {fieldState.invalid && (
                  <FieldError
                    id="gallery-caption-error"
                    errors={[fieldState.error]}
                  />
                )}
              </Field>
            )}
          />

          <Controller
            name="sort_order"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="gallery-order">Urutan</FieldLabel>
                <Input
                  {...field}
                  value={field.value === undefined ? "" : String(field.value)}
                  id="gallery-order"
                  type="number"
                  inputMode="numeric"
                  step={1}
                  aria-invalid={fieldState.invalid}
                  aria-describedby="gallery-order-hint gallery-order-error"
                  className="h-11 bg-card sm:max-w-40"
                />
                <FieldDescription id="gallery-order-hint">
                  Angka kecil tampil lebih dulu. Jika sama, foto terbaru dulu.
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError
                    id="gallery-order-error"
                    errors={[fieldState.error]}
                  />
                )}
              </Field>
            )}
          />
        </FieldGroup>

        <div className="rounded-lg bg-card p-5 shadow-card sm:p-6">
          <Controller
            name="url"
            control={form.control}
            render={({ field, fieldState }) => (
              <ImageField
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                folder="gallery"
                error={fieldState.error?.message}
              />
            )}
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" size="lg" className="h-11 px-4">
          <Link href={GALLERY_ADMIN_PATH}>Batal</Link>
        </Button>
        <Button type="submit" size="lg" className="h-11 px-4" disabled={busy}>
          {busy ? "Menyimpan..." : image ? "Simpan perubahan" : "Tambah foto"}
        </Button>
      </div>
    </form>
  );
}
