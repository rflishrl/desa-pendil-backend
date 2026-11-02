"use client";

import { useActionState } from "react";
import { uploadGalleryAction, type FormState } from "@/app/admin/actions";
import { ImageField } from "@/components/admin/ImageField";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Field, inputCls, Notice } from "@/components/admin/ui";

export function GalleryUploadForm() {
  const [state, action] = useActionState<FormState, FormData>(uploadGalleryAction, {});
  const err = state.errors ?? {};

  return (
    <form action={action} className="space-y-5 rounded-2xl bg-white p-5 shadow-card sm:p-6" noValidate>
      <h2 className="text-lg font-bold">Tambah foto</h2>
      {state.message ? <Notice tone="error">{state.message}</Notice> : null}
      <ImageField name="files" label="Foto" multiple required serverError={err.files} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Deskripsi foto"
          htmlFor="alt"
          hint="Dibaca pembaca layar dan tampil jika gambar gagal dimuat."
          error={err.alt}
          required
        >
          <input
            id="alt"
            name="alt"
            defaultValue={state.values?.alt}
            maxLength={200}
            aria-invalid={err.alt ? true : undefined}
            aria-describedby={err.alt ? "alt-error" : "alt-hint"}
            className={inputCls}
          />
        </Field>
        <Field label="Keterangan (opsional)" htmlFor="caption">
          <input id="caption" name="caption" defaultValue={state.values?.caption} maxLength={300} className={inputCls} />
        </Field>
      </div>
      <SubmitButton pendingLabel="Mengunggah…">Unggah</SubmitButton>
    </form>
  );
}
