import type { Metadata } from "next";
import Link from "next/link";
import { deleteArticleAction } from "@/app/admin/actions";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { Badge, btn, inputCls, Notice, PageHeader, STATUS_LABEL, TYPE_LABEL } from "@/components/admin/ui";
import { ARTICLE_STATUSES, ARTICLE_TYPES } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/datetime";
import { listArticles } from "@/services/articles";

export const metadata: Metadata = { title: "Konten" };
export const dynamic = "force-dynamic";

type SP = Promise<{ q?: string; type?: string; status?: string; page?: string; notice?: string }>;

const pick = <T extends readonly string[]>(list: T, v?: string): T[number] | undefined =>
  v && (list as readonly string[]).includes(v) ? (v as T[number]) : undefined;

export default async function ArticlesPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const type = pick(ARTICLE_TYPES, sp.type);
  const status = pick(ARTICLE_STATUSES, sp.status);
  const q = sp.q?.trim() || undefined;
  const page = Math.max(Number.parseInt(sp.page ?? "1", 10) || 1, 1);

  const result = await listArticles({ type, status, q, page, limit: 10 });

  const href = (p: number) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/articles${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Konten"
        description="Berita, artikel, dan postingan."
        action={
          <Link href="/admin/articles/new" className={btn.primary}>
            Tulis konten baru
          </Link>
        }
      />

      {sp.notice ? (
        <div className="mb-4">
          <Notice>{sp.notice}</Notice>
        </div>
      ) : null}

      <form method="get" role="search" className="mb-4 grid gap-3 rounded-2xl bg-white p-4 shadow-card sm:grid-cols-[1fr_auto_auto_auto]">
        <div>
          <label htmlFor="q" className="sr-only">
            Cari judul
          </label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Cari judul…" className={inputCls} />
        </div>
        <div>
          <label htmlFor="type" className="sr-only">
            Jenis
          </label>
          <select id="type" name="type" defaultValue={type ?? ""} className={inputCls}>
            <option value="">Semua jenis</option>
            {ARTICLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="sr-only">
            Status
          </label>
          <select id="status" name="status" defaultValue={status ?? ""} className={inputCls}>
            <option value="">Semua status</option>
            {ARTICLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={btn.secondary}>
          Terapkan
        </button>
      </form>

      <section aria-label="Daftar konten" className="rounded-2xl bg-white shadow-card">
        {result.items.length === 0 ? (
          <p className="px-6 py-12 text-center text-muted">
            {q || type || status ? "Tidak ada konten yang cocok." : "Belum ada konten. Mulai dengan menulis yang pertama."}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {result.items.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0">
                  <Link
                    href={`/admin/articles/${a.id}`}
                    className="line-clamp-2 font-semibold underline-offset-4 hover:underline"
                  >
                    {a.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {a.author} · {formatDateTime(a.publishedAt ?? a.createdAt)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Badge tone="neutral">{TYPE_LABEL[a.type]}</Badge>
                    <Badge tone={a.status}>{STATUS_LABEL[a.status]}</Badge>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Link href={`/admin/articles/${a.id}`} className={btn.secondary}>
                    Edit
                  </Link>
                  <ConfirmDelete action={deleteArticleAction} id={a.id} itemName={a.title} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {result.totalPages > 1 ? (
        <nav aria-label="Halaman" className="mt-4 flex items-center justify-between">
          {page > 1 ? (
            <Link href={href(page - 1)} className={btn.secondary}>
              Sebelumnya
            </Link>
          ) : (
            <span />
          )}
          <p className="text-sm text-muted">
            Halaman {result.page} dari {result.totalPages} · {result.total} konten
          </p>
          {page < result.totalPages ? (
            <Link href={href(page + 1)} className={btn.secondary}>
              Berikutnya
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
