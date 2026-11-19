<script lang="ts">
	import { Images, Pencil, Plus } from '@lucide/svelte';
	import { refreshAll } from '$app/navigation';

	import { api } from '#lib/api/client.js';
	import type { Paginated } from '#lib/api/types.js';
	import DeleteDialog from '#lib/components/admin-kit/DeleteDialog.svelte';
	import PaginationNav from '#lib/components/admin-kit/PaginationNav.svelte';
	import { buttonVariants } from '#lib/components/ui/button.js';
	import type { GalleryDto } from '#lib/features/gallery/schemas.js';
	import { toast } from '#lib/stores/toast.svelte.js';

	interface Props {
		list: Paginated<GalleryDto>;
	}

	let { list }: Props = $props();

	async function handleDelete(id: string): Promise<void> {
		await api.delete(`/api/admin/gallery/${id}`);
		toast.success('Foto berhasil dihapus.');
		await refreshAll();
	}
</script>

{#if list.items.length === 0}
	<div
		class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center"
	>
		<div class="mb-3 flex size-10 items-center justify-center rounded-lg bg-muted">
			<Images class="size-5 text-muted-foreground" aria-hidden="true" />
		</div>
		<h2 class="text-base font-semibold text-foreground">Belum ada foto</h2>
		<p class="mt-1 max-w-sm text-sm text-muted-foreground">
			Tambahkan foto pertama agar tampil di Galeri Desa.
		</p>
		<div class="mt-5">
			<a href="/admin/gallery/new" class={buttonVariants({ size: 'lg', className: 'h-11 px-4' })}>
				<Plus class="size-4" aria-hidden="true" />
				Tambah foto
			</a>
		</div>
	</div>
{:else}
	<div>
		<ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{#each list.items as image (image.id)}
				<li class="overflow-hidden rounded-lg bg-card shadow-card">
					<img
						src={image.thumbUrl ?? image.url}
						alt={image.alt}
						width={400}
						height={300}
						loading="lazy"
						decoding="async"
						class="aspect-4/3 w-full bg-muted object-cover"
					/>
					<div class="space-y-1 p-4">
						<p class="line-clamp-2 font-semibold">{image.alt}</p>
						{#if image.caption}
							<p class="line-clamp-2 text-sm text-muted-foreground">{image.caption}</p>
						{/if}
						<p class="text-sm text-muted-foreground">Urutan {image.sortOrder}</p>
					</div>
					<div class="flex justify-end gap-1 border-t border-border px-2 py-2">
						<a
							href={`/admin/gallery/${image.id}/edit`}
							aria-label={`Ubah ${image.alt}`}
							class={buttonVariants({ variant: 'ghost', size: 'lg', className: 'h-11 px-3' })}
						>
							<Pencil class="size-4" aria-hidden="true" />
							Ubah
						</a>
						<DeleteDialog itemName={image.alt} onConfirm={() => handleDelete(image.id)} />
					</div>
				</li>
			{/each}
		</ul>
		<PaginationNav pagination={list.pagination} basePath="/admin/gallery" q="" />
	</div>
{/if}
