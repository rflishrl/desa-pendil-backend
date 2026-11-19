<script lang="ts">
	import { CircleAlert } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';

	import { api } from '#lib/api/client.js';
	import ImageField from '#lib/components/admin-kit/ImageField.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { buttonVariants } from '#lib/components/ui/button.js';
	import {
		ARTICLE_STATUS_LABELS,
		ARTICLE_STATUSES,
		ARTICLE_TYPE_LABELS,
		ARTICLE_TYPES,
		type ArticleDto,
		type ArticleStatus,
		type ArticleType,
		articleCreateSchema
	} from '#lib/features/articles/schemas.js';
	import { toast } from '#lib/stores/toast.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		article?: ArticleDto;
	}

	let { article }: Props = $props();

	let title = $state('');
	let type = $state<ArticleType>('berita');
	let excerpt = $state('');
	let content = $state('');
	let thumbnailUrl = $state('');
	let author = $state('Admin');
	let status = $state<ArticleStatus>('draft');

	$effect(() => {
		title = article?.title ?? '';
		type = article?.type ?? 'berita';
		excerpt = article?.excerpt ?? '';
		content = article?.content ?? '';
		thumbnailUrl = article?.thumbnail ?? '';
		author = article?.author ?? 'Admin';
		status = article?.status ?? 'draft';
	});

	let saving = $state(false);
	let serverError = $state<string | null>(null);
	let fieldErrors = $state<Record<string, string>>({});
	let alertEl = $state<HTMLDivElement | null>(null);

	async function handleSubmit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (saving) return;

		serverError = null;
		fieldErrors = {};

		const parsed = articleCreateSchema.safeParse({
			title,
			type,
			excerpt,
			content,
			thumbnail_url: thumbnailUrl,
			author,
			status
		});

		if (!parsed.success) {
			const nextErrors: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const key = String(issue.path[0] ?? '');
				if (key && !nextErrors[key]) nextErrors[key] = issue.message;
			}
			fieldErrors = nextErrors;
			const firstKey = Object.keys(nextErrors)[0];
			if (firstKey) {
				document.getElementById(`article-${firstKey}`)?.focus();
			}
			return;
		}

		saving = true;
		try {
			if (article) {
				await api.patch<ArticleDto>(`/api/admin/articles/${article.id}`, parsed.data);
				toast.success('Perubahan konten berhasil disimpan.');
			} else {
				await api.post<ArticleDto>('/api/admin/articles', parsed.data);
				toast.success('Konten baru berhasil ditambahkan.');
			}
			await goto(resolve('/admin/articles'));
		} catch (err) {
			serverError = err instanceof Error ? err.message : 'Gagal menyimpan konten.';
			saving = false;
			await tick();
			alertEl?.focus();
		}
	}
</script>

<form novalidate onsubmit={(e) => void handleSubmit(e)} class="space-y-6">
	{#if serverError}
		<div
			bind:this={alertEl}
			role="alert"
			tabindex="-1"
			class="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive outline-none"
		>
			<CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
			<p>{serverError}</p>
		</div>
	{/if}

	<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
		<div class="space-y-5 rounded-lg bg-card p-5 shadow-card sm:p-6">
			<div class="space-y-1.5">
				<label for="article-title" class="block text-sm font-medium text-foreground">
					Judul <span aria-hidden="true" class="text-destructive">*</span>
				</label>
				<input
					id="article-title"
					type="text"
					bind:value={title}
					maxlength={200}
					autocomplete="off"
					enterkeyhint="next"
					required
					aria-invalid={Boolean(fieldErrors.title)}
					aria-describedby={fieldErrors.title ? 'article-title-error' : undefined}
					class="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
				/>
				{#if fieldErrors.title}
					<p id="article-title-error" role="alert" class="text-xs font-medium text-destructive">
						{fieldErrors.title}
					</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				<label for="article-excerpt" class="block text-sm font-medium text-foreground">
					Ringkasan
				</label>
				<textarea
					id="article-excerpt"
					bind:value={excerpt}
					rows={2}
					maxlength={300}
					aria-invalid={Boolean(fieldErrors.excerpt)}
					aria-describedby={fieldErrors.excerpt ? 'article-excerpt-error' : undefined}
					class="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
				></textarea>
				{#if fieldErrors.excerpt}
					<p id="article-excerpt-error" role="alert" class="text-xs font-medium text-destructive">
						{fieldErrors.excerpt}
					</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				<label for="article-content" class="block text-sm font-medium text-foreground">
					Isi <span aria-hidden="true" class="text-destructive">*</span>
				</label>
				<textarea
					id="article-content"
					bind:value={content}
					rows={14}
					maxlength={50000}
					required
					aria-invalid={Boolean(fieldErrors.content)}
					aria-describedby={fieldErrors.content ? 'article-content-error' : undefined}
					class="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
				></textarea>
				{#if fieldErrors.content}
					<p id="article-content-error" role="alert" class="text-xs font-medium text-destructive">
						{fieldErrors.content}
					</p>
				{/if}
			</div>
		</div>

		<div class="space-y-6">
			<div class="space-y-5 rounded-lg bg-card p-5 shadow-card sm:p-6">
				<div class="space-y-2">
					<span id="article-type-label" class="block text-sm font-medium text-foreground">
						Jenis
					</span>
					<div
						role="radiogroup"
						aria-labelledby="article-type-label"
						aria-describedby="article-type-hint"
						class="grid grid-cols-3 gap-2"
					>
						{#each ARTICLE_TYPES as itemType (itemType)}
							{@const checked = type === itemType}
							<label
								class={cn(
									'flex cursor-pointer items-center justify-center rounded-lg border p-2.5 text-center text-xs font-semibold transition-colors focus-within:ring-2 focus-within:ring-ring',
									checked
										? 'border-primary bg-primary text-primary-foreground shadow-xs'
										: 'border-input bg-card text-foreground hover:bg-accent'
								)}
							>
								<input
									type="radio"
									name="article-type"
									value={itemType}
									{checked}
									onchange={() => (type = itemType)}
									class="sr-only"
								/>
								{ARTICLE_TYPE_LABELS[itemType]}
							</label>
						{/each}
					</div>
					<p id="article-type-hint" class="text-xs text-muted-foreground">
						Hanya berita yang tampil di halaman Berita website.
					</p>
				</div>

				<div class="space-y-2">
					<span id="article-status-label" class="block text-sm font-medium text-foreground">
						Status
					</span>
					<div
						role="radiogroup"
						aria-labelledby="article-status-label"
						aria-describedby="article-status-hint"
						class="grid grid-cols-2 gap-2"
					>
						{#each ARTICLE_STATUSES as itemStatus (itemStatus)}
							{@const checked = status === itemStatus}
							<label
								class={cn(
									'flex cursor-pointer items-center justify-center rounded-lg border p-2.5 text-center text-xs font-semibold transition-colors focus-within:ring-2 focus-within:ring-ring',
									checked
										? 'border-primary bg-primary text-primary-foreground shadow-xs'
										: 'border-input bg-card text-foreground hover:bg-accent'
								)}
							>
								<input
									type="radio"
									name="article-status"
									value={itemStatus}
									{checked}
									onchange={() => (status = itemStatus)}
									class="sr-only"
								/>
								{ARTICLE_STATUS_LABELS[itemStatus]}
							</label>
						{/each}
					</div>
					<p id="article-status-hint" class="text-xs text-muted-foreground">
						Draf tidak muncul di API publik.
					</p>
				</div>

				<div class="space-y-1.5">
					<label for="article-author" class="block text-sm font-medium text-foreground">
						Penulis <span aria-hidden="true" class="text-destructive">*</span>
					</label>
					<input
						id="article-author"
						type="text"
						bind:value={author}
						maxlength={80}
						autocomplete="name"
						autocapitalize="words"
						required
						aria-invalid={Boolean(fieldErrors.author)}
						aria-describedby={fieldErrors.author ? 'article-author-error' : undefined}
						class="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
					/>
					{#if fieldErrors.author}
						<p id="article-author-error" role="alert" class="text-xs font-medium text-destructive">
							{fieldErrors.author}
						</p>
					{/if}
				</div>
			</div>

			<div class="rounded-lg bg-card p-5 shadow-card sm:p-6">
				<ImageField
					value={thumbnailUrl}
					onChange={(nextUrl) => (thumbnailUrl = nextUrl)}
					folder="articles"
					error={fieldErrors.thumbnail_url}
					idPrefix="article-thumb"
				/>
			</div>
		</div>
	</div>

	<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
		<a
			href="/admin/articles"
			class={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-11 px-4' })}
		>
			Batal
		</a>
		<Button type="submit" size="lg" class="h-11 px-4" disabled={saving}>
			{saving ? 'Menyimpan...' : article ? 'Simpan perubahan' : 'Tambah konten'}
		</Button>
	</div>
</form>
