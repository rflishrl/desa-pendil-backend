"use client";

import { useEffect, useState } from "react";

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

/** Image picker with instant preview and client-side checks (the server re-validates). */
export function ImageField({
  name,
  label,
  existingUrl,
  removeName,
  serverError,
  multiple = false,
  required = false,
}: {
  name: string;
  label: string;
  existingUrl?: string | null;
  removeName?: string;
  serverError?: string;
  multiple?: boolean;
  required?: boolean;
}) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [remove, setRemove] = useState(false);

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const total = files.reduce((sum, f) => sum + f.size, 0);
    const problem = files.find((f) => !ACCEPT.includes(f.type))
      ? "Format harus JPG, PNG, atau WebP."
      : total > MAX_BYTES
        ? "Total ukuran maksimal 4 MB."
        : undefined;

    setError(problem);
    if (problem) {
      e.target.value = "";
      setPreviews([]);
      return;
    }
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  }

  const shown = previews.length ? previews : existingUrl && !remove ? [existingUrl] : [];
  const message = error ?? serverError;

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-semibold text-ink">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {shown.length > 0 ? (
        <ul className="flex flex-wrap gap-3">
          {shown.map((src) => (
            <li key={src} className="size-24 overflow-hidden rounded-lg border border-line bg-canvas">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob: previews cannot use next/image */}
              <img src={src} alt="" className="size-full object-cover" />
            </li>
          ))}
        </ul>
      ) : null}
      <input
        id={name}
        name={name}
        type="file"
        accept={ACCEPT.join(",")}
        multiple={multiple}
        required={required}
        onChange={onChange}
        aria-invalid={Boolean(message)}
        aria-describedby={`${name}-hint`}
        className="block w-full cursor-pointer rounded-lg border border-line bg-white text-sm text-muted file:mr-4 file:min-h-11 file:cursor-pointer file:border-0 file:bg-primary file:px-4 file:font-semibold file:text-ink hover:file:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
      {message ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {message}
        </p>
      ) : (
        <p id={`${name}-hint`} className="text-sm text-muted">
          JPG, PNG, atau WebP. Maksimal 4 MB.
        </p>
      )}
      {removeName && existingUrl && previews.length === 0 ? (
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name={removeName}
            checked={remove}
            onChange={(e) => setRemove(e.target.checked)}
            className="size-4 accent-[#F0A400]"
          />
          Hapus gambar saat ini
        </label>
      ) : null}
    </div>
  );
}
