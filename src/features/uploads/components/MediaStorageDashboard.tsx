"use client";

import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  HardDriveIcon,
  RefreshCwIcon,
} from "lucide-react";
import type * as React from "react";

import { ListSkeleton } from "@/components/admin-kit/list-skeleton";
import { PaginationNav } from "@/components/admin-kit/pagination-nav";
import { Thumb } from "@/components/admin-kit/thumb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMediaStorageSummary } from "@/features/uploads/hooks";
import { STORAGE_ADMIN_PATH } from "@/features/uploads/queries";
import {
  MEDIA_STORAGE_DEFAULT_LIMIT,
  type MediaAssetItem,
  type MediaQuotaStatus,
} from "@/features/uploads/schemas";
import { formatDate } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatMbOrGb(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB (${mb.toLocaleString("id-ID")} MB)`;
  }
  return `${mb.toLocaleString("id-ID")} MB`;
}

function getQuotaBadgeConfig(status: MediaQuotaStatus) {
  switch (status) {
    case "critical":
      return {
        label: "Kritis (>= 90%)",
        icon: AlertCircleIcon,
        className:
          "border border-destructive/30 bg-destructive/10 text-destructive dark:border-red-800/60 dark:bg-red-950/60 dark:text-red-300",
        fillColor: "var(--destructive)",
      };
    case "warning":
      return {
        label: "Waspada (70-89%)",
        icon: AlertTriangleIcon,
        className:
          "border border-amber-500/30 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/60 dark:text-amber-300",
        fillColor: "#d97706",
      };
    default:
      return {
        label: "Normal (< 70%)",
        icon: CheckCircle2Icon,
        className:
          "border border-success/25 bg-success-soft text-success dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300",
        fillColor: "var(--color-success)",
      };
  }
}

function AssetStatusBadge({ item }: { item: MediaAssetItem }) {
  if (item.isReferenced) {
    return (
      <Badge className="border border-success/25 bg-success-soft text-success dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300">
        <CheckCircle2Icon aria-hidden="true" />
        Aktif
      </Badge>
    );
  }
  if (item.isEligibleForCleanup) {
    return (
      <Badge className="border border-amber-500/30 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/60 dark:text-amber-300">
        <AlertTriangleIcon aria-hidden="true" />
        Siap dibersihkan
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <ClockIcon aria-hidden="true" />
      Tenggang 24 jam
    </Badge>
  );
}

function StorageMonitorSkeleton() {
  return (
    <div role="status" aria-label="Memuat ringkasan penyimpanan" className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-2.5 w-full rounded-full" />
          <Skeleton className="h-4 w-64" />
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-44" />
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
      <ListSkeleton rows={4} />
    </div>
  );
}

export function MediaStorageDashboard({ page }: { page: number }) {
  const { data, error, isPending, isFetching, refetch } = useMediaStorageSummary({
    page,
    limit: MEDIA_STORAGE_DEFAULT_LIMIT,
  });

  if (isPending) {
    return <StorageMonitorSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" />
        <AlertTitle>Data penyimpanan gagal dimuat</AlertTitle>
        <AlertDescription>
          <p>{error.message}</p>
          <Button variant="outline" className="mt-2 h-11" onClick={() => refetch()}>
            <RefreshCwIcon aria-hidden="true" />
            Muat ulang
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const { usage, config, items, pagination } = data;
  const badge = getQuotaBadgeConfig(usage.status);
  const StatusIcon = badge.icon;
  const fullShare = usage.usedBytes > 0 ? Math.round((usage.fullBytes / usage.usedBytes) * 100) : 0;
  const thumbShare = usage.usedBytes > 0 ? 100 - fullShare : 0;

  return (
    <div aria-busy={isFetching} className="space-y-6">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 px-4"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCwIcon aria-hidden="true" className={isFetching ? "animate-spin" : undefined} />
          {isFetching ? "Menyegarkan..." : "Segarkan data"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle id="quota-summary-title">Ringkasan Kuota Media R2</CardTitle>
          <CardDescription>
            Akumulasi pemakaian varian full + thumbnail tercatat di Neon DB (tanpa ListObjectsV2).
          </CardDescription>
          <CardAction>
            <Badge className={badge.className}>
              <StatusIcon aria-hidden="true" />
              {badge.label}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="font-heading text-2xl font-extrabold tabular-nums sm:text-3xl">
                {formatBytes(usage.usedBytes)}
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">
                dari kuota aplikasi {formatMbOrGb(usage.quotaMb)}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-lg font-bold tabular-nums">{usage.usedPercent}% terpakai</p>
              <p className="text-sm text-muted-foreground tabular-nums">
                Sisa kuota {formatBytes(usage.remainingBytes)} &middot;{" "}
                {usage.totalCount.toLocaleString("id-ID")} aset
              </p>
            </div>
          </div>

          <Progress
            aria-labelledby="quota-summary-title"
            value={usage.usedBytes}
            max={usage.quotaBytes}
            style={{ "--quota-fill": badge.fillColor } as React.CSSProperties}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Komposisi & Status Aset</CardTitle>
            <CardDescription>
              Pemecahan ukuran file WebP serta status referensi konten aktif.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2 border-b pb-2">
              <span className="text-muted-foreground">Gambar Full (maks 1920 px)</span>
              <span className="font-semibold tabular-nums">
                {formatBytes(usage.fullBytes)} ({fullShare}%)
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 border-b pb-2">
              <span className="text-muted-foreground">Thumbnail (maks 480 px)</span>
              <span className="font-semibold tabular-nums">
                {formatBytes(usage.thumbBytes)} ({thumbShare}%)
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 border-b pb-2">
              <span className="text-muted-foreground">Aset Aktif (dipakai konten)</span>
              <span className="font-semibold tabular-nums">
                {usage.activeCount.toLocaleString("id-ID")} aset
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">Aset Orphan</span>
              <span className="text-right font-semibold tabular-nums">
                {usage.orphanCount.toLocaleString("id-ID")} total
                {usage.orphanCount > 0 && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {usage.gracePeriodOrphanCount} tenggang 24 jam &middot;{" "}
                    {usage.eligibleCleanupCount} siap dibersihkan
                  </span>
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Konfigurasi Penyimpanan</CardTitle>
            <CardDescription>Metadata non-rahasia lingkungan runtime saat ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2 border-b pb-2">
              <span className="text-muted-foreground">Provider Aktif</span>
              <Badge variant="default">Cloudflare R2</Badge>
            </div>
            <div className="flex items-center justify-between gap-2 border-b pb-2">
              <span className="text-muted-foreground">Bucket Target</span>
              <span className="font-mono text-xs font-semibold">
                {config.bucketName ?? "Belum diatur"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 border-b pb-2">
              <span className="text-muted-foreground">Environment & Prefix Key</span>
              <span className="font-mono text-xs font-semibold">
                {config.environment} ({config.keyPrefix})
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 border-b pb-2">
              <span className="text-muted-foreground">Domain Media Publik</span>
              <Badge variant={config.publicDomainConfigured ? "outline" : "secondary"}>
                {config.publicDomainConfigured ? "Terkonfigurasi" : "Belum diatur"}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Batas Upload per File</span>
              <span className="font-semibold tabular-nums">{config.maxUploadMb} MB</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="media-assets-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="media-assets-heading" className="font-heading text-lg font-bold">
            Daftar Aset Media R2
          </h2>
          <p className="text-xs text-muted-foreground tabular-nums">
            Menampilkan {items.length} dari {pagination.total.toLocaleString("id-ID")} aset
          </p>
        </div>

        {items.length === 0 ? (
          <Empty className="border border-dashed bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HardDriveIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Belum ada aset di media_objects</EmptyTitle>
              <EmptyDescription>
                Unggah foto berita atau galeri baru untuk melihat catatan objek WebP di sini.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-lg bg-card shadow-card md:block">
              <Table>
                <TableCaption className="sr-only">
                  Daftar aset media R2 yang tercatat di database
                </TableCaption>
                <TableHeader className="bg-muted/60">
                  <TableRow>
                    <TableHead scope="col" className="px-4">
                      Aset & Dimensi
                    </TableHead>
                    <TableHead scope="col" className="px-4">
                      Folder
                    </TableHead>
                    <TableHead scope="col" className="px-4">
                      Ukuran (Full + Thumb)
                    </TableHead>
                    <TableHead scope="col" className="px-4">
                      Status
                    </TableHead>
                    <TableHead scope="col" className="px-4 text-right">
                      Tanggal Unggah
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.key}>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Thumb src={item.thumbUrl} />
                          <div className="min-w-0">
                            <p
                              className="max-w-xs truncate font-mono text-xs font-semibold"
                              title={item.key}
                            >
                              {item.key}
                            </p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {item.width} x {item.height} px
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4">
                        <Badge variant="outline">{item.folder || "umum"}</Badge>
                      </TableCell>
                      <TableCell className="px-4 tabular-nums">
                        <p className="font-semibold">{formatBytes(item.totalBytes)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(item.sizeBytes)} + {formatBytes(item.thumbSizeBytes)}
                        </p>
                      </TableCell>
                      <TableCell className="px-4">
                        <AssetStatusBadge item={item} />
                      </TableCell>
                      <TableCell className="px-4 text-right text-muted-foreground tabular-nums">
                        {formatDate(item.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="space-y-3 md:hidden">
              {items.map((item) => (
                <li key={item.key} className="rounded-lg bg-card p-4 shadow-card">
                  <div className="flex gap-3">
                    <Thumb src={item.thumbUrl} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-mono text-xs font-semibold" title={item.key}>
                        {item.key}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {item.width} x {item.height} px &middot; {formatBytes(item.totalBytes)} (
                        {formatBytes(item.sizeBytes)} + {formatBytes(item.thumbSizeBytes)})
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Badge variant="outline">{item.folder || "umum"}</Badge>
                        <AssetStatusBadge item={item} />
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 border-t pt-2 text-xs text-muted-foreground tabular-nums">
                    Diunggah {formatDate(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>

            <PaginationNav pagination={pagination} basePath={STORAGE_ADMIN_PATH} q="" />
          </>
        )}
      </section>
    </div>
  );
}
