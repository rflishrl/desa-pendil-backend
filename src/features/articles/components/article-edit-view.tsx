"use client";

import { AlertCircleIcon } from "lucide-react";

import { ListSkeleton } from "@/components/admin-kit/list-skeleton";
import { PageHeading } from "@/components/admin-kit/page-heading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArticleForm } from "@/features/articles/components/article-form";
import { useArticle } from "@/features/articles/hooks";

export function ArticleEditView({ id }: { id: string }) {
  const { data, error, isPending } = useArticle(id);

  if (isPending) return <ListSkeleton rows={3} />;
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" />
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <PageHeading title="Ubah konten" description={data.title} />
      <ArticleForm key={data.updatedAt} article={data} />
    </>
  );
}
