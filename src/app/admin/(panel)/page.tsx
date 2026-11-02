import Link from "next/link";
import { btn, Badge, PageHeader, STATUS_LABEL, TYPE_LABEL } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/datetime";
import { articleStats, listArticles } from "@/services/articles";
import { countGallery } from "@/services/gallery";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAdmin();
  const [stats, galleryTotal, recent] = await Promise.all([
    articleStats(),
    countGallery(),
    listArticles({ limit: 5 }),
  ]);

  const cards = [
    { label: "Terbit", value: stats.published },
    { label: "Draf", value: stats.draft },
    { label: "Berita", value: stats.byType.berita },
    { label: "Foto galeri", value: galleryTotal },
  ];

  return (
    <>
      <PageHeader
        title="Ringkasan"
        description="Gambaran singkat konten website."
        action={
          <Link href="/admin/articles/new" className={btn.primary}>
            Tulis konten baru
          </Link>
        }
      />

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label} className="rounded-2xl bg-white p-4 shadow-card sm:p-5">
            <p className="text-sm font-medium text-muted">{c.label}</p>
            <p className="mt-1 font-mono text-3xl font-semibold">{c.value}</p>
          </li>
        ))}
      </ul>

      <section aria-labelledby="terbaru" className="mt-8 rounded-2xl bg-white p-4 shadow-card sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="terbaru" className="text-lg font-bold">
            Konten terbaru
          </h2>
          <Link href="/admin/articles" className="text-sm font-semibold text-primary-700 underline-offset-4 hover:underline">
            Lihat semua
          </Link>
        </div>
        {recent.items.length === 0 ? (
          <p className="py-6 text-center text-muted">Belum ada konten.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recent.items.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/articles/${a.id}`}
                    className="line-clamp-1 font-semibold underline-offset-4 hover:underline"
                  >
                    {a.title}
                  </Link>
                  <p className="text-sm text-muted">
                    {TYPE_LABEL[a.type]} · {formatDateTime(a.publishedAt ?? a.createdAt)}
                  </p>
                </div>
                <Badge tone={a.status}>{STATUS_LABEL[a.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
