import type { Metadata } from "next";
import Image from "next/image";
import { deleteGalleryAction, updateGalleryAction } from "@/app/admin/actions";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Field, inputCls, Notice, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { absoluteUrl } from "@/lib/storage";
import { listGallery } from "@/services/gallery";
import { GalleryUploadForm } from "./GalleryUploadForm";

export const metadata: Metadata = { title: "Galeri" };
export const dynamic = "force-dynamic";

export default async function GalleryAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireAdmin();
  const { notice } = await searchParams;
  const items = await listGallery();

  return (
    <>
      <PageHeader title="Galeri" description="Foto kegiatan yang tampil di halaman Galeri Desa." />
      {notice ? (
        <div className="mb-4">
          <Notice>{notice}</Notice>
        </div>
      ) : null}

      <GalleryUploadForm />

      <section aria-label="Daftar foto" className="mt-8">
        {items.length === 0 ? (
          <p className="rounded-2xl bg-white px-6 py-12 text-center text-muted shadow-card">Belum ada foto.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((g) => (
              <li key={g.id} className="overflow-hidden rounded-2xl bg-white shadow-card">
                <div className="relative aspect-[4/3] bg-canvas">
                  <Image
                    src={absoluteUrl(g.url) ?? g.url}
                    alt={g.alt}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <form action={updateGalleryAction} className="space-y-3 p-4">
                  <input type="hidden" name="id" value={g.id} />
                  <Field label="Deskripsi" htmlFor={`alt-${g.id}`}>
                    <input id={`alt-${g.id}`} name="alt" defaultValue={g.alt} maxLength={200} required className={inputCls} />
                  </Field>
                  <Field label="Keterangan" htmlFor={`cap-${g.id}`}>
                    <input id={`cap-${g.id}`} name="caption" defaultValue={g.caption ?? ""} maxLength={300} className={inputCls} />
                  </Field>
                  <Field label="Urutan" htmlFor={`ord-${g.id}`} hint="Angka kecil tampil lebih dulu.">
                    <input
                      id={`ord-${g.id}`}
                      name="sortOrder"
                      type="number"
                      inputMode="numeric"
                      defaultValue={g.sortOrder}
                      className={inputCls}
                    />
                  </Field>
                  <div className="flex items-center justify-between">
                    <SubmitButton variant="secondary">Simpan</SubmitButton>
                    <ConfirmDelete action={deleteGalleryAction} id={g.id} itemName={g.alt} description="Foto akan dihapus dari galeri dan penyimpanan." />
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
