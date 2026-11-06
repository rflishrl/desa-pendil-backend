"use client";

import { ImageIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useId, useRef, useState } from "react";

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
import { cn } from "@/lib/utils";

interface ImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  onBlur?: () => void;
  folder: UploadFolder;
  required?: boolean;
  error?: string;
}

/** Image upload field (uploads directly to Blob storage) with manual URL fallback. */
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
  const fileInputId = useId();
  const upload = useUploadPhoto(folder);
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file) return;
    upload.mutate(file, {
      onSuccess: ({ url }) => onChange(url),
      onSettled: () => {
        if (inputRef.current) inputRef.current.value = "";
      },
    });
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const file = e.clipboardData.files?.[0];
    if (file) handleFile(file);
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

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        tabIndex={0}
        role="region"
        aria-label="Area pratinjau dan drag-and-drop foto"
        className={cn(
          "relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-md border transition-all focus-visible:outline-2 focus-visible:outline-ring/70",
          isDragging ? "border-brand bg-brand/10 ring-2 ring-brand" : "bg-card",
        )}
      >
        {isDragging ? (
          <div className="flex size-full flex-col items-center justify-center gap-2 bg-brand/15 px-4 text-center text-sm font-semibold text-brand-strong">
            <UploadIcon aria-hidden="true" className="size-8 animate-bounce" />
            Lepaskan file foto di sini
          </div>
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary URL preview
          <img
            src={value}
            alt="Pratinjau foto"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
            <ImageIcon aria-hidden="true" className="size-8" />
            <span>Belum ada foto</span>
            <span className="text-xs text-muted-foreground/80">
              Seret & lepas berkas atau tempel (Ctrl+V) di sini
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          id={fileInputId}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-background focus:p-2 focus:shadow"
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
