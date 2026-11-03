import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka daftar selama data dimuat; ukurannya sama dengan baris asli (foto 56 px). */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-label="Memuat data"
      className="space-y-3 rounded-lg bg-card p-4 shadow-card"
    >
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-14 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <Skeleton className="h-11 w-20" />
        </div>
      ))}
    </div>
  );
}
