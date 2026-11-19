<script lang="ts">
	import {
		AlertTriangle,
		ArrowUpRight,
		CheckCircle2,
		Images,
		Newspaper,
		Plus
	} from '@lucide/svelte';

	import CopyButton from '#lib/components/admin-kit/CopyButton.svelte';
	import PageHeading from '#lib/components/admin-kit/PageHeading.svelte';
	import { buttonVariants } from '#lib/components/ui/button.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const ENDPOINTS = [
		{
			method: 'GET',
			path: '/api/news/v1',
			note: 'Daftar berita yang terbit',
			access: 'Publik'
		},
		{
			method: 'GET',
			path: '/api/news/v1/{id atau slug}',
			note: 'Satu berita',
			access: 'Publik'
		},
		{
			method: 'GET',
			path: '/api/gallery/v1',
			note: 'Foto galeri berurutan',
			access: 'Publik'
		},
		{
			method: 'GET / POST',
			path: '/api/admin/articles',
			note: 'Daftar dan tambah konten',
			access: 'Admin'
		},
		{
			method: 'GET / POST',
			path: '/api/admin/gallery',
			note: 'Daftar dan tambah foto',
			access: 'Admin'
		},
		{
			method: 'PATCH / DELETE',
			path: '/api/admin/.../{id}',
			note: 'Ubah atau hapus data',
			access: 'Admin'
		},
		{ method: 'POST', path: '/api/upload', note: 'Unggah foto', access: 'Admin' }
	] as const;

	let stats = $derived([
		{
			label: 'Total Artikel',
			value: data.counts.articles,
			href: '/admin/articles',
			category: 'Artikel',
			icon: Newspaper
		},
		{
			label: 'Artikel Terbit',
			value: data.counts.published,
			href: '/admin/articles',
			category: 'Publikasi',
			icon: CheckCircle2
		},
		{
			label: 'Foto Galeri',
			value: data.counts.gallery,
			href: '/admin/gallery',
			category: 'Dokumentasi',
			icon: Images
		}
	]);
</script>

<svelte:head>
	<title>Dashboard | Panel Admin Desa Pendil</title>
</svelte:head>

<div class="space-y-8">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<PageHeading
			title="Dashboard"
			description="Ringkasan konten publikasi dan galeri website Desa Pendil."
		/>
		<div class="flex items-center gap-2">
			<a
				href="/admin/articles/new"
				class={buttonVariants({ variant: 'outline', size: 'sm', className: 'h-9 gap-1.5' })}
			>
				<Plus class="size-4" aria-hidden="true" />
				<span>Konten Baru</span>
			</a>
		</div>
	</div>

	{#if !data.storageReady}
		<div
			role="alert"
			class="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
		>
			<AlertTriangle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
			<div class="space-y-1">
				<p class="font-semibold">Perhatian Unggah Foto</p>
				<p class="text-destructive/90">
					Unggah foto belum aktif karena konfigurasi Cloudflare R2 (<code>R2_*</code>) belum
					lengkap. Anda masih bisa menambah data dengan menempel URL media yang valid.
				</p>
			</div>
		</div>
	{/if}

	<section aria-labelledby="stats-heading">
		<h2 id="stats-heading" class="sr-only">Jumlah Data Konten</h2>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each stats as stat (stat.label)}
				{@const Icon = stat.icon}
				<a
					href={stat.href}
					class="group block rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
				>
					<div
						class="h-full rounded-xl border border-border/80 bg-card/60 p-6 backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md dark:bg-card/40"
					>
						<div class="flex flex-row items-center justify-between pb-2">
							<div
								class="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-muted/50 text-muted-foreground group-hover:border-brand/40 group-hover:bg-brand/10 group-hover:text-brand-strong dark:group-hover:text-brand"
							>
								<Icon class="size-4.5" aria-hidden="true" />
							</div>
							<span
								class="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
							>
								{stat.category}
							</span>
						</div>
						<div class="pt-2">
							<div class="flex items-baseline justify-between">
								<div>
									<div class="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
										{stat.value}
									</div>
									<p
										class="mt-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground"
									>
										{stat.label}
									</p>
								</div>
								<ArrowUpRight
									class="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-strong dark:group-hover:text-brand"
									aria-hidden="true"
								/>
							</div>
						</div>
					</div>
				</a>
			{/each}
		</div>
	</section>

	<section aria-labelledby="quick-actions-heading">
		<div class="rounded-xl border border-border bg-card text-card-foreground shadow-xs">
			<div class="space-y-1 p-6 pb-4">
				<h2 id="quick-actions-heading" class="text-base font-semibold">Aksi Cepat</h2>
				<p class="text-sm text-muted-foreground">
					Pintasan cepat untuk mempublikasikan artikel berita atau menambahkan foto ke galeri publik
					desa.
				</p>
			</div>
			<div class="px-6 pb-6">
				<div class="grid gap-3 sm:grid-cols-2">
					<a
						href="/admin/articles/new"
						class={buttonVariants({
							className: 'h-11 w-full justify-start gap-2.5 px-4 font-medium'
						})}
					>
						<Plus class="size-4" aria-hidden="true" />
						<span>Tambah Konten Berita</span>
					</a>
					<a
						href="/admin/gallery/new"
						class={buttonVariants({
							variant: 'outline',
							className: 'h-11 w-full justify-start gap-2.5 px-4 font-medium'
						})}
					>
						<Plus class="size-4" aria-hidden="true" />
						<span>Unggah Foto Galeri</span>
					</a>
				</div>
			</div>
		</div>
	</section>

	<section aria-labelledby="api-heading">
		<div class="rounded-xl border border-border bg-card text-card-foreground shadow-xs">
			<div class="p-6 pb-4">
				<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 id="api-heading" class="text-base font-semibold text-foreground">
							Daftar Alamat API
						</h2>
						<p class="text-sm text-muted-foreground">
							Daftar endpoint publik dan internal admin untuk situs Desa Pendil.
						</p>
					</div>
					<span
						class="inline-flex w-fit items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium"
					>
						{ENDPOINTS.length} Endpoints
					</span>
				</div>
			</div>
			<div class="px-6 pb-6">
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div
					tabindex="0"
					role="region"
					aria-labelledby="api-table-caption"
					class="overflow-x-auto rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-ring/70"
				>
					<table class="w-full text-sm">
						<caption id="api-table-caption" class="sr-only">Daftar rute API Desa Pendil</caption>
						<thead class="border-b border-border bg-muted/40 text-left">
							<tr>
								<th scope="col" class="w-32 px-4 py-3 font-medium">Metode</th>
								<th scope="col" class="px-4 py-3 font-medium">Rute Alamat</th>
								<th scope="col" class="px-4 py-3 font-medium">Keterangan</th>
								<th scope="col" class="w-24 px-4 py-3 text-right font-medium">Akses</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border">
							{#each ENDPOINTS as endpoint (`${endpoint.method}-${endpoint.path}`)}
								<tr class="transition-colors hover:bg-muted/30">
									<td class="px-4 py-3">
										{#if endpoint.method === 'GET'}
											<span
												class="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 font-mono text-xs font-medium whitespace-nowrap"
											>
												GET
											</span>
										{:else if endpoint.method === 'POST' || endpoint.method.includes('POST')}
											<span
												class="inline-flex items-center rounded-full bg-brand/15 px-2.5 py-0.5 font-mono text-xs font-medium whitespace-nowrap text-brand-strong dark:bg-brand/20 dark:text-brand"
											>
												{endpoint.method}
											</span>
										{:else}
											<span
												class="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 font-mono text-xs font-medium whitespace-nowrap text-secondary-foreground"
											>
												{endpoint.method}
											</span>
										{/if}
									</td>
									<td class="px-4 py-3">
										<div
											class="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground"
										>
											<span>{endpoint.path}</span>
											<CopyButton value={endpoint.path} label={`path ${endpoint.path}`} />
										</div>
									</td>
									<td class="px-4 py-3 text-sm text-muted-foreground">
										{endpoint.note}
									</td>
									<td class="px-4 py-3 text-right">
										<span
											class={endpoint.access === 'Publik'
												? 'inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground'
												: 'inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium'}
										>
											{endpoint.access}
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</section>
</div>
