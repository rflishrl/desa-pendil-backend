"use client";

import { CheckCircle2Icon, ImageIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

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
  type UploadMetrics,
} from "@/features/uploads/schemas";
import { CLIENT_MAX_BYTES, prepareImageForUpload } from "@/lib/image/prepare";
import { cn } from "@/lib/utils";

export interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  onBlur?: () => void;
  folder: UploadFolder;
  required?: boolean;
  error?: string;
}

type UploadStage = "idle" | "preparing" | "uploading";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function getSourceFormatLabel(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case "image/png":
      return "PNG";
    case "image/jpeg":
      return "JPG";
    case "image/webp":
      return "WebP";
    default:
      return "Asli";
  }
}

/** Accessible drag-and-drop & keyboard photo uploader with client pre-shrink and WebP metrics. */
export function ImageUploader({
  value,
  onChange,
  onBlur,
  folder,
  required,
  error,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const urlId = useId();
  const fileInputId = useId();
  const progressLabelId = useId();

  const upload = useUploadPhoto(folder);
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState("");
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [lastMetrics, setLastMetrics] = useState<{
    originalSize: number;
    sourceLabel: string;
    metrics: UploadMetrics;
  } | null>(null);

  function revokePreviewUrl() {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setLocalPreviewUrl(null);
  }

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  async function handleFile(file: File | undefined) {
    if (!file || busy) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      const msg = "Format file harus JPG, PNG, atau WebP statis.";
      setLocalError(msg);
      setStatusAnnouncement(msg);
      toast.error(msg);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setLocalError(null);
    setLastMetrics(null);
    setProgress(0);

    revokePreviewUrl();
    const objectUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = objectUrl;
    setLocalPreviewUrl(objectUrl);

    const originalSize = file.size;
    const sourceLabel = getSourceFormatLabel(file.type);
    const needsShrink = originalSize > CLIENT_MAX_BYTES;

    let fileToSend = file;
    if (needsShrink) {
      setStage("preparing");
      setStatusAnnouncement("Menyiapkan gambar...");
      try {
        const prepared = await prepareImageForUpload(file);
        fileToSend = prepared.file;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Gagal menyiapkan gambar di browser.";
        revokePreviewUrl();
        setStage("idle");
        setLocalError(msg);
        setStatusAnnouncement(msg);
        toast.error(msg);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }

    setStage("uploading");
    setStatusAnnouncement("Mengunggah dan mengonversi ke WebP...");

    upload.mutate(
      {
        file: fileToSend,
        onProgress: (pct) => setProgress(pct),
      },
      {
        onSuccess: (result) => {
          revokePreviewUrl();
          onChange(result.url);
          if (result.metrics) {
            setLastMetrics({
              originalSize,
              sourceLabel,
              metrics: result.metrics,
            });
          }
          setStatusAnnouncement("Foto berhasil diunggah dan dikonversi ke WebP.");
        },
        onError: (err) => {
          revokePreviewUrl();
          const msg = err.message || "Gagal mengunggah foto.";
          setLocalError(msg);
          setStatusAnnouncement(msg);
          toast.error(msg);
        },
        onSettled: () => {
          setStage("idle");
          setProgress(0);
          if (inputRef.current) inputRef.current.value = "";
        },
      },
    );
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
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function handlePaste(e: React.ClipboardEvent) {
    if (busy) return;
    const file = e.clipboardData.files?.[0];
    if (file) void handleFile(file);
  }

  function handleClearPhoto() {
    revokePreviewUrl();
    setLastMetrics(null);
    setLocalError(null);
    onChange("");
    setStatusAnnouncement("Foto dihapus dari formulir.");
  }

  const busy = stage !== "idle" || upload.isPending;
  const activePreviewSrc = localPreviewUrl || value;
  const displayedError = localError || upload.error?.message;
  const savedPercent =
    lastMetrics && lastMetrics.originalSize > 0
      ? Math.max(
          0,
          Math.round(
            ((lastMetrics.originalSize - lastMetrics.metrics.totalCompressedSize) /
              lastMetrics.originalSize) *
              100,
          ),
        )
      : 0;

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
          "relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-ring",
          isDragging ? "border-brand bg-brand/10 ring-2 ring-brand" : "bg-card",
        )}
      >
        {isDragging ? (
          <div className="flex size-full flex-col items-center justify-center gap-2 bg-brand/15 px-4 text-center text-sm font-semibold text-brand-strong">
            <UploadIcon aria-hidden="true" className="size-8" />
            Lepaskan file foto di sini
          </div>
        ) : activePreviewSrc ? (
          <img src={activePreviewSrc} alt="Pratinjau foto" className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
            <ImageIcon aria-hidden="true" className="size-8" />
            <span>Belum ada foto</span>
            <span className="text-xs text-muted-foreground">
              Seret dan lepas berkas atau tempel (Ctrl+V) di sini
            </span>
          </div>
        )}
      </div>

      {busy && (
        <div className="space-y-1.5 rounded-md border bg-muted/40 p-3">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-foreground">
            <span id={progressLabelId}>
              {stage === "preparing"
                ? "Menyiapkan gambar..."
                : "Mengunggah dan mengonversi ke WebP..."}
            </span>
            {stage === "uploading" && (
              <span className="tabular-nums text-muted-foreground">{progress}%</span>
            )}
          </div>
          {stage === "preparing" ? (
            <progress
              aria-labelledby={progressLabelId}
              className="h-2 w-full overflow-hidden rounded-full accent-brand-strong"
            />
          ) : (
            <progress
              aria-labelledby={progressLabelId}
              value={progress}
              max={100}
              className="h-2 w-full overflow-hidden rounded-full accent-brand-strong"
            />
          )}
        </div>
      )}

      {lastMetrics && !busy && (
        <div className="flex items-start gap-2 rounded-md border border-success/25 bg-success-soft px-3 py-2 text-xs font-medium text-success dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300">
          <CheckCircle2Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="tabular-nums">
            {formatFileSize(lastMetrics.originalSize)} {lastMetrics.sourceLabel} {"->"}{" "}
            {formatFileSize(lastMetrics.metrics.fullSize)} +{" "}
            {formatFileSize(lastMetrics.metrics.thumbSize)} WebP
            {savedPercent > 0 ? ` • Hemat ${savedPercent}%` : ""}
          </span>
        </div>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {statusAnnouncement}
      </p>

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          id={fileInputId}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-background focus:p-2 focus:shadow"
          aria-label="Pilih file foto"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 px-4"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <UploadIcon aria-hidden="true" />
          {busy
            ? stage === "preparing"
              ? "Menyiapkan..."
              : "Mengunggah..."
            : value
              ? "Ganti foto"
              : "Pilih foto"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-11 px-4"
            onClick={handleClearPhoto}
            disabled={busy}
          >
            <Trash2Icon aria-hidden="true" />
            Hapus foto
          </Button>
        )}
      </div>
      <FieldDescription>
        JPG, PNG, atau WebP statis. Maksimal {MAX_UPLOAD_MB} MB (otomatis dikompres ke WebP).
      </FieldDescription>

      {displayedError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {displayedError}
        </p>
      )}

      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={urlId}>Atau tempel alamat foto yang sudah diunggah</FieldLabel>
        <Input
          id={urlId}
          type="url"
          inputMode="url"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(event) => {
            setLastMetrics(null);
            onChange(event.target.value);
          }}
          onBlur={onBlur}
          placeholder="https://..."
          aria-invalid={Boolean(error)}
          aria-describedby={`${urlId}-hint${error ? ` ${urlId}-error` : ""}`}
          className="h-11 bg-card"
        />
        <FieldDescription id={`${urlId}-hint`}>
          Mendukung alamat media R2 aplikasi.
        </FieldDescription>
        {error && <FieldError id={`${urlId}-error`}>{error}</FieldError>}
      </Field>
    </FieldSet>
  );
}
