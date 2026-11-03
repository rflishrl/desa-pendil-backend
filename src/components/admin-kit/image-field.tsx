"use client";

import { ImageIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useUploadPhoto } from "@/features/uploads/hooks";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_UPLOAD_MB,
  type UploadFolder,
} from "@/features/uploads/schemas";

interface ImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  onBlur?: () => void;
  folder: UploadFolder;
  required?: boolean;
  error?: string;
}

/** Pilih foto (diunggah langsung ke Vercel Blob) atau tempel alamat foto yang sudah ada. */
export function ImageField({
  value,
  onChange,
  onBlur,
  folder,
  required,
  error,
}: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const urlId = useId();
  const upload = useUploadPhoto(folder);

  function handleFile(file: File | undefined) {
    if (!file) return;
    upload.mutate(file, {
      onSuccess: ({ url }) => onChange(url),
      onSettled: () => {
        if (inputRef.current) inputRef.current.value = "";
      },
    });
  }

  const uploading = upload.isPending;

  return (
    <FieldSet>
      <FieldLegend>
        Foto
        {required && (
          <span aria-hidden="true" className="text-destructive">
            {" "}
            *
          </span>
        )}
      </FieldLegend>

      <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-md border bg-card">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- pratinjau alamat yang diketik bebas
          <img
            src={value}
            alt="Pratinjau foto"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
            <ImageIcon aria-hidden="true" className="size-8" />
            Belum ada foto
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-label="Pilih file foto"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 px-4"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <UploadIcon aria-hidden="true" />
          {uploading ? "Mengunggah..." : value ? "Ganti foto" : "Pilih foto"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-11 px-4"
            onClick={() => onChange("")}
            disabled={uploading}
          >
            <Trash2Icon aria-hidden="true" />
            Hapus foto
          </Button>
        )}
      </div>
      <FieldDescription>
        JPG, PNG, atau WebP. Maksimal {MAX_UPLOAD_MB} MB.
      </FieldDescription>

      {upload.error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {upload.error.message}
        </p>
      )}

      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={urlId}>
          Atau tempel alamat foto yang sudah diunggah
        </FieldLabel>
        <Input
          id={urlId}
          type="url"
          inputMode="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder="https://..."
          aria-invalid={Boolean(error)}
          aria-describedby={`${urlId}-hint${error ? ` ${urlId}-error` : ""}`}
          className="h-11 bg-card"
        />
        <FieldDescription id={`${urlId}-hint`}>
          Hanya alamat Vercel Blob
          (https://...public.blob.vercel-storage.com/...).
        </FieldDescription>
        {error && <FieldError id={`${urlId}-error`}>{error}</FieldError>}
      </Field>
    </FieldSet>
  );
}
