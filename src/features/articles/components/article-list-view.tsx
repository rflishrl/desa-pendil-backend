"use client";

import { Link } from "@tanstack/react-router";
import { AlertCircleIcon, NewspaperIcon, PencilIcon, PlusIcon } from "lucide-react";

import { DeleteDialog } from "@/components/admin-kit/delete-dialog";
import { ListSkeleton } from "@/components/admin-kit/list-skeleton";
import { PaginationNav } from "@/components/admin-kit/pagination-nav";
import { Thumb } from "@/components/admin-kit/thumb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useArticleList, useDeleteArticle } from "@/features/articles/hooks";
import { ARTICLES_ADMIN_PATH, type ArticleListParams } from "@/features/articles/queries";
import { ARTICLE_TYPE_LABELS, type ArticleDto } from "@/features/articles/schemas";
import { formatDate } from "@/lib/utils";

function StatusBadge({ status }: { status: ArticleDto["status"] }) {
  return status === "published" ? (
    <Badge className="border border-success/20 bg-success-soft font-semibold text-success shadow-none">
      Terbit
    </Badge>
  ) : (
    <Badge variant="secondary">Draf</Badge>
  );
}

function RowActions({ article }: { article: ArticleDto }) {
  const remove = useDeleteArticle();
  return (
    <div className="flex justify-end gap-1">
      <Button asChild variant="ghost" size="lg" className="h-11 px-3">
        <Link
          to="/admin/articles/$id/edit"
          params={{ id: article.id }}
          aria-label={`Ubah ${article.title}`}
        >
          <PencilIcon aria-hidden="true" />
          <span className="hidden sm:inline">Ubah</span>
        </Link>
      </Button>
      <DeleteDialog itemName={article.title} onConfirm={() => remove.mutateAsync(article.id)} />
    </div>
  );
}

export function ArticleListView({ params }: { params: ArticleListParams }) {
  const { data, error, isPending, isFetching, refetch } = useArticleList(params);

  if (isPending) return <ListSkeleton />;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" />
        <AlertTitle>Data gagal dimuat</AlertTitle>
        <AlertDescription>
          <p>{error.message}</p>
          <Button variant="outline" className="mt-2 h-11" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (data.items.length === 0) {
    return (
      <Empty className="border border-dashed bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <NewspaperIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{params.q ? "Tidak ada hasil" : "Belum ada konten"}</EmptyTitle>
          <EmptyDescription>
            {params.q ? "Coba kata kunci lain." : "Tulis berita pertama agar tampil di website."}
          </EmptyDescription>
        </EmptyHeader>
        {params.q ? (
          <EmptyContent>
            <Button asChild variant="outline" size="lg" className="h-11 px-4">
              <Link to={ARTICLES_ADMIN_PATH}>Reset pencarian</Link>
            </Button>
          </EmptyContent>
        ) : (
          <EmptyContent>
            <Button asChild size="lg" className="h-11 px-4">
              <Link to={`${ARTICLES_ADMIN_PATH}/new`}>
                <PlusIcon aria-hidden="true" />
                Tambah konten
              </Link>
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }

  return (
    <div aria-busy={isFetching}>
      <div
        tabIndex={0}
        role="region"
        aria-labelledby="articles-table-caption"
        className="hidden overflow-x-auto rounded-lg bg-card shadow-card focus-visible:outline-2 focus-visible:outline-ring/70 md:block"
      >
        <Table>
          <TableCaption id="articles-table-caption" className="sr-only">
            Daftar konten artikel dan berita desa
          </TableCaption>
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead className="px-4">Judul</TableHead>
              <TableHead className="px-4">Jenis</TableHead>
              <TableHead className="px-4">Status</TableHead>
              <TableHead className="px-4">Dibuat</TableHead>
              <TableHead className="px-4 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((article, index) => (
              <TableRow key={article.id}>
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Thumb src={article.thumbnail ?? ""} priority={index < 4} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{article.title}</p>
                      <p className="truncate text-muted-foreground">{article.author}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-4">{ARTICLE_TYPE_LABELS[article.type]}</TableCell>
                <TableCell className="px-4">
                  <StatusBadge status={article.status} />
                </TableCell>
                <TableCell className="px-4 whitespace-nowrap">
                  {formatDate(article.createdAt)}
                </TableCell>
                <TableCell className="px-4">
                  <RowActions article={article} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {data.items.map((article, index) => (
          <li key={article.id} className="rounded-lg bg-card p-4 shadow-card">
            <div className="flex gap-3">
              <Thumb src={article.thumbnail ?? ""} priority={index < 3} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{article.title}</p>
                <p className="text-sm text-muted-foreground">
                  {ARTICLE_TYPE_LABELS[article.type]} &middot; {formatDate(article.createdAt)}
                </p>
              </div>
              <div className="shrink-0">
                <StatusBadge status={article.status} />
              </div>
            </div>
            <div className="mt-3 border-t pt-3">
              <RowActions article={article} />
            </div>
          </li>
        ))}
      </ul>

      <PaginationNav pagination={data.pagination} basePath={ARTICLES_ADMIN_PATH} q={params.q} />
    </div>
  );
}
