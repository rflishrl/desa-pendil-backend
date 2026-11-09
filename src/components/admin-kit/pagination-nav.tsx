import { Link } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Pagination } from "@/lib/api/types";

export function PaginationNav({
  pagination,
  basePath,
  q,
}: {
  pagination: Pagination;
  basePath: string;
  q: string;
}) {
  const { page, total } = pagination;
  const totalPages = Math.max(1, pagination.totalPages);
  const href = (target: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <nav
      aria-label="Halaman"
      className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground"
    >
      <p>
        {total} data &middot; halaman {page} dari {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Button asChild variant="outline" size="lg" className="h-11 px-3">
            <Link to={href(page - 1)} rel="prev">
              <ChevronLeftIcon aria-hidden="true" />
              Sebelumnya
            </Link>
          </Button>
        )}
        {page < totalPages && (
          <Button asChild variant="outline" size="lg" className="h-11 px-3">
            <Link to={href(page + 1)} rel="next">
              Berikutnya
              <ChevronRightIcon aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
