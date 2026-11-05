import { cn } from "@/lib/utils";

/** Thumbnail image. Uses native <img> to support legacy images outside next/image remote patterns. */
export function Thumb({ src, className }: { src: string; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- see comment above
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
