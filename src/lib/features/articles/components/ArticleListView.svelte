<script lang="ts">
	import { Newspaper, Pencil, Plus } from '@lucide/svelte';
	import { refreshAll } from '$app/navigation';

	import { api } from '#lib/api/client.js';
	import type { Paginated } from '#lib/api/types.js';
	import DeleteDialog from '#lib/components/admin-kit/DeleteDialog.svelte';
	import PaginationNav from '#lib/components/admin-kit/PaginationNav.svelte';
	import Thumb from '#lib/components/admin-kit/Thumb.svelte';
	import { buttonVariants } from '#lib/components/ui/button.js';
	import { ARTICLE_TYPE_LABELS, type ArticleDto } from '#lib/features/articles/schemas.js';
	import { toast } from '#lib/stores/toast.svelte.js';
	import { formatDate } from '#lib/utils.js';

	interface Props {
		list: Paginated<ArticleDto>;
		q: string;
	}

	let { list, q }: Props = $props();

	async function handleDelete(id: string): Promise<void> {
		await api.delete(`/api/admin/articles/${id}`);
		toast.success('Konten berhasil dihapus.');
		await refreshAll();
	}
</script>

{#if list.items.length === 0}
	<div
		class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center"
	>
		<div class="mb-3 flex size-10 items-center justify-center rounded-lg bg-muted">
			<Newspaper class="size-5 text-muted-foreground" aria-hidden="true" />
		</div>
		<h2 class="text-base font-semibold text-foreground">
			{q ? 'Tidak ada hasil' : 'Belum ada konten'}
		</h2>
		<p class="mt-1 max-w-sm text-sm text-muted-foreground">
			{q ? 'Coba kata kunci lain.' : 'Tulis berita pertama agar tampil di website.'}
		</p>
		<div class="mt-5">
			{#if q}
				<a
					href="/admin/articles"
					class={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-11 px-4' })}
				>
					Reset pencarian
				</a>
			{:else}
				<a
					href="/admin/articles/new"
					class={buttonVariants({ size: 'lg', className: 'h-11 px-4' })}
				>
					<Plus class="size-4" aria-hidden="true" />
					Tambah konten
				</a>
			{/if}
		</div>
	</div>
{:else}
	<div>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			tabindex="0"
			role="region"
			aria-labelledby="articles-table-caption"
			class="hidden overflow-x-auto rounded-lg bg-card shadow-card focus-visible:outline-2 focus-visible:outline-ring/70 md:block"
		>
			<table class="w-full text-sm">
				<caption id="articles-table-caption" class="sr-only">
					Daftar konten artikel dan berita desa
				</caption>
				<thead class="border-b border-border bg-muted/60 text-left">
					<tr>
						<th scope="col" class="px-4 py-3 font-medium">Judul</th>
						<th scope="col" class="px-4 py-3 font-medium">Jenis</th>
						<th scope="col" class="px-4 py-3 font-medium">Status</th>
						<th scope="col" class="px-4 py-3 font-medium">Dibuat</th>
						<th scope="col" class="px-4 py-3 text-right font-medium">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each list.items as article (article.id)}
						<tr class="transition-colors hover:bg-muted/30">
							<td class="px-4 py-3">
								<div class="flex items-center gap-3">
									<Thumb src={article.thumbUrl ?? article.thumbnail ?? ''} />
									<div class="min-w-0">
										<p class="truncate font-semibold">{article.title}</p>
										<p class="truncate text-muted-foreground">{article.author}</p>
									</div>
								</div>
							</td>
							<td class="px-4 py-3">{ARTICLE_TYPE_LABELS[article.type]}</td>
							<td class="px-4 py-3">
								{#if article.status === 'published'}
									<span
										class="inline-flex items-center rounded-full border border-success/20 bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success"
									>
										Terbit
									</span>
								{:else}
									<span
										class="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
									>
										Draf
									</span>
								{/if}
							</td>
							<td class="px-4 py-3 whitespace-nowrap">
								{formatDate(article.createdAt)}
							</td>
							<td class="px-4 py-3">
								<div class="flex justify-end gap-1">
									<a
										href={`/admin/articles/${article.id}/edit`}
										aria-label={`Ubah ${article.title}`}
										class={buttonVariants({
											variant: 'ghost',
											size: 'lg',
											className: 'h-11 px-3'
										})}
									>
										<Pencil class="size-4" aria-hidden="true" />
										<span class="hidden sm:inline">Ubah</span>
									</a>
									<DeleteDialog
										itemName={article.title}
										onConfirm={() => handleDelete(article.id)}
									/>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<ul class="space-y-3 md:hidden">
			{#each list.items as article (article.id)}
				<li class="rounded-lg bg-card p-4 shadow-card">
					<div class="flex gap-3">
						<Thumb src={article.thumbUrl ?? article.thumbnail ?? ''} />
						<div class="min-w-0 flex-1">
							<p class="font-semibold">{article.title}</p>
							<p class="text-sm text-muted-foreground">
								{ARTICLE_TYPE_LABELS[article.type]} &middot; {formatDate(article.createdAt)}
							</p>
						</div>
						<div class="shrink-0">
							{#if article.status === 'published'}
								<span
									class="inline-flex items-center rounded-full border border-success/20 bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success"
								>
									Terbit
								</span>
							{:else}
								<span
									class="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
								>
									Draf
								</span>
							{/if}
						</div>
					</div>
					<div class="mt-3 flex justify-end gap-1 border-t border-border pt-3">
						<a
							href={`/admin/articles/${article.id}/edit`}
							aria-label={`Ubah ${article.title}`}
							class={buttonVariants({ variant: 'ghost', size: 'lg', className: 'h-11 px-3' })}
						>
							<Pencil class="size-4" aria-hidden="true" />
							<span>Ubah</span>
						</a>
						<DeleteDialog itemName={article.title} onConfirm={() => handleDelete(article.id)} />
					</div>
				</li>
			{/each}
		</ul>

		<PaginationNav pagination={list.pagination} basePath="/admin/articles" {q} />
	</div>
{/if}
