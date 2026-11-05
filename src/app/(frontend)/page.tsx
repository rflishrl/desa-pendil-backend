import configPromise from "@payload-config";
import { getPayload } from "payload";
import Image from "next/image";
import Link from "next/link";
import type { Announcement, News, Service, VillageOfficial } from "@/payload-types";

export const revalidate = 60;

export default async function LandingPageDesa() {
  let beritaDocs: News[] = [];
  let pengumumanDocs: Announcement[] = [];
  let perangkatDocs: VillageOfficial[] = [];
  let layananDocs: Service[] = [];

  try {
    const payload = await getPayload({ config: configPromise });
    const [beritaData, pengumumanData, perangkatData, layananData] =
      await Promise.all([
        payload.find({
          collection: "news",
          where: { status: { equals: "published" } },
          sort: "-tanggalTerbit",
          limit: 3,
          depth: 1,
        }),
        payload.find({
          collection: "announcements",
          where: { aktif: { equals: true } },
          limit: 5,
        }),
        payload.find({
          collection: "village-officials",
          sort: "urutan",
          depth: 1,
        }),
        payload.find({
          collection: "services",
          limit: 6,
        }),
      ]);
    beritaDocs = beritaData.docs;
    pengumumanDocs = pengumumanData.docs;
    perangkatDocs = perangkatData.docs;
    layananDocs = layananData.docs;
  } catch (error) {
    console.warn("Database tidak dapat diakses saat render:", error);
  }

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Desa Pendil
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Portal Informasi & Layanan Administrasi Kependudukan Warga
        </p>
        <div className="mt-4">
          <Link
            href="/admin"
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground"
          >
            Masuk ke Panel Admin CMS
          </Link>
        </div>
      </header>

      {/* Pengumuman Aktif */}
      {pengumumanDocs.length > 0 && (
        <section aria-labelledby="pengumuman-title" className="mb-12">
          <h2 id="pengumuman-title" className="mb-4 text-2xl font-bold">
            Pengumuman Penting
          </h2>
          <div className="space-y-3">
            {pengumumanDocs.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4"
              >
                <h3 className="font-semibold text-amber-900 dark:text-amber-200">
                  {item.judul}
                </h3>
                <p className="mt-1 text-sm text-foreground/80">{item.isi}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Berita Terbaru */}
      <section aria-labelledby="berita-title" className="mb-12">
        <h2 id="berita-title" className="mb-4 text-2xl font-bold">
          Kabar Desa Terbaru
        </h2>
        {beritaDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada berita yang diterbitkan.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {beritaDocs.map((b) => {
              const media =
                typeof b.gambarUtama === "object" ? b.gambarUtama : null;
              return (
                <article
                  key={b.id}
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-shadow hover:shadow-md"
                >
                  {media?.url && (
                    <div className="relative aspect-video w-full bg-muted">
                      <Image
                        src={media.url}
                        alt={media.alt || b.judul}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <time className="text-xs text-muted-foreground">
                      {new Date(b.tanggalTerbit).toLocaleDateString("id-ID", {
                        dateStyle: "medium",
                      })}
                    </time>
                    <h3 className="mt-1 line-clamp-2 text-lg font-bold">
                      <Link
                        href={`/berita/${b.slug}`}
                        className="hover:text-primary"
                      >
                        {b.judul}
                      </Link>
                    </h3>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Perangkat Desa */}
      <section aria-labelledby="perangkat-title" className="mb-12">
        <h2 id="perangkat-title" className="mb-4 text-2xl font-bold">
          Pemerintah Desa
        </h2>
        {perangkatDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Data perangkat desa belum ditambahkan.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {perangkatDocs.map((p) => {
              const foto = typeof p.foto === "object" ? p.foto : null;
              return (
                <div
                  key={p.id}
                  className="rounded-lg border border-border p-4 text-center"
                >
                  {foto?.url && (
                    <div className="relative mx-auto mb-3 size-24 overflow-hidden rounded-full bg-muted">
                      <Image
                        src={foto.url}
                        alt={p.nama}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <h3 className="font-semibold">{p.nama}</h3>
                  <p className="text-xs text-muted-foreground">{p.jabatan}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Layanan Surat */}
      <section aria-labelledby="layanan-title">
        <h2 id="layanan-title" className="mb-4 text-2xl font-bold">
          Layanan Administrasi
        </h2>
        {layananDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada layanan yang ditambahkan.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {layananDocs.map((l) => (
              <div key={l.id} className="rounded-lg border border-border p-4">
                <h3 className="font-semibold text-lg">{l.namaLayanan}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {l.deskripsi}
                </p>
                {l.persyaratan && l.persyaratan.length > 0 && (
                  <ul className="mt-3 list-inside list-disc text-xs text-foreground/80">
                    {l.persyaratan.map((syaratItem, idx) => (
                      <li key={idx}>{syaratItem.syarat}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
