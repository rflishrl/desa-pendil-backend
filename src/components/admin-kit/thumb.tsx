import { cn } from "@/lib/utils";

/** Foto kecil di daftar. `<img>` biasa: foto lama bisa berasal dari host di luar next/image. */
export function Thumb({ src, className }: { src: string; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- lihat komentar di atas
    <img
      src={src}
      alt=""
      width={56}
      height={56}
      loading="lazy"
      decoding="async"
      className={cn("size-14 shrink-0 rounded-md object-cover", className)}
    />
  ) : (
    <div
      aria-label="Tanpa foto"
      role="img"
      className={cn(
        "flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground",
        className,
      )}
    >
      -
    </div>
  );
}
