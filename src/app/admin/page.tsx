import {
  AlertTriangleIcon,
  CircleCheckIcon,
  ImagesIcon,
  NewspaperIcon,
  PlusIcon,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeading } from "@/components/admin-kit/page-heading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardCounts } from "@/features/dashboard/service";
import { getCurrentAdmin } from "@/lib/auth/session";
import { createSessionClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/news/v1",
    note: "Daftar berita yang terbit",
    access: "Publik",
  },
  {
    method: "GET",
    path: "/api/news/v1/{id atau slug}",
    note: "Satu berita",
    access: "Publik",
  },
  {
    method: "GET",
    path: "/api/gallery/v1",
    note: "Foto galeri berurutan",
    access: "Publik",
  },
  {
    method: "GET / POST",
    path: "/api/admin/articles",
    note: "Daftar dan tambah konten",
    access: "Admin",
  },
  {
    method: "GET / POST",
    path: "/api/admin/gallery",
    note: "Daftar dan tambah foto",
    access: "Admin",
  },
  {
    method: "PATCH / DELETE",
    path: "/api/admin/.../{id}",
    note: "Ubah atau hapus data",
    access: "Admin",
  },
  { method: "POST", path: "/api/upload", note: "Unggah foto", access: "Admin" },
];
function StatCard({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: number;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-lg bg-card p-5 shadow-card transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none"
    >
      <span className="inline-flex size-12 items-center justify-center rounded-md bg-brand/15 text-brand-strong">
        <Icon className="size-[26px]" aria-hidden="true" />
      </span>
      <span>
        <span className="block font-heading text-3xl leading-none font-extrabold">
          {value}
        </span>
        <span className="mt-1 block text-sm font-semibold text-muted-foreground group-hover:text-foreground">
          {label}
        </span>
      </span>
    </Link>
  );
}

/**
 * Dashboard dirender penuh di server: datanya hanya angka ringkasan tanpa interaksi,
 * jadi tidak perlu TanStack Query atau hidrasi.
 */
export default async function DashboardPage() {
  const [supabase, actor] = await Promise.all([
    createSessionClient(),
    getCurrentAdmin(),
  ]);
  const counts = await getDashboardCounts(supabase, actor);
  const blobReady = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

  return (
    <>
      <PageHeading
        title="Dashboard"
        description="Ringkasan konten yang tampil di website Desa Pendil."
      />

      {!blobReady && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangleIcon aria-hidden="true" />
          <AlertDescription>
            Unggah foto belum aktif karena <code>BLOB_READ_WRITE_TOKEN</code>{" "}
            belum diisi. Anda masih bisa menambah data dengan menempel URL foto.
          </AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="stats-title">
        <h2 id="stats-title" className="sr-only">
          Jumlah data
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Konten"
            value={counts.articles}
            href="/admin/articles"
            icon={NewspaperIcon}
          />
          <StatCard
            label="Sudah terbit"
            value={counts.published}
            href="/admin/articles"
            icon={CircleCheckIcon}
          />
          <StatCard
            label="Foto galeri"
            value={counts.gallery}
            href="/admin/gallery"
            icon={ImagesIcon}
          />
        </div>
      </section>

      <section aria-labelledby="quick-title" className="mt-8">
        <h2 id="quick-title" className="font-heading text-lg font-bold">
          Tambah cepat
        </h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-11 px-4">
            <Link href="/admin/articles/new">
              <PlusIcon aria-hidden="true" />
              Konten
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-11 px-4">
            <Link href="/admin/gallery/new">
              <PlusIcon aria-hidden="true" />
              Foto
            </Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="api-title" className="mt-10">
        <h2 id="api-title" className="font-heading text-lg font-bold">
          Alamat API
        </h2>
        <p className="mt-1 text-muted-foreground">
          Frontend membaca data dari alamat publik. Perubahan di panel ini
          langsung tampil jika FRONTEND_URL dan REVALIDATE_SECRET diisi; jika
          tidak, setelah cache habis (sekitar 1 jam).
        </p>
        <div className="mt-3 overflow-hidden rounded-lg bg-card shadow-card">
          <Table>
            <TableCaption className="sr-only">Daftar alamat API</TableCaption>
            <TableHeader className="bg-muted/60">
              <TableRow>
                <TableHead className="px-4">Metode</TableHead>
                <TableHead className="px-4">Alamat</TableHead>
                <TableHead className="px-4">Fungsi</TableHead>
                <TableHead className="px-4">Akses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ENDPOINTS.map((endpoint) => (
                <TableRow key={`${endpoint.method}-${endpoint.path}`}>
                  <TableCell className="px-4 font-mono text-xs font-semibold">
                    {endpoint.method}
                  </TableCell>
                  <TableCell className="px-4 font-mono text-xs">
                    {endpoint.path}
                  </TableCell>
                  <TableCell className="px-4">{endpoint.note}</TableCell>
                  <TableCell className="px-4">{endpoint.access}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </>
  );
}
