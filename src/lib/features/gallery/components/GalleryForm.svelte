<script lang="ts">
	import { CircleAlert } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';

	import { api } from '#lib/api/client.js';
	import ImageField from '#lib/components/admin-kit/ImageField.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { buttonVariants } from '#lib/components/ui/button.js';
	import { type GalleryDto, galleryCreateSchema } from '#lib/features/gallery/schemas.js';
	import { toast } from '#lib/stores/toast.svelte.js';

	interface Props {
		image?: GalleryDto;
	}

	let { image }: Props = $props();

	let url = $state('');
	let alt = $state('');
	let caption = $state('');
	let sortOrder = $state('0');

	$effect(() => {
		url = image?.url ?? '';
		alt = image?.alt ?? '';
		caption = image?.caption ?? '';
		sortOrder = image ? String(image.sortOrder) : '0';
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

		const parsed = galleryCreateSchema.safeParse({
			url,
			alt,
			caption,
			sort_order: sortOrder
		});

		if (!parsed.success) {
			const nextErrors: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const key = String(issue.path[0] ?? '');
				if (key && !nextErrors[key]) nextErrors[key] = issue.message;
			}
			fieldErrors = nextErrors;
			const firstKey = Object.keys(nextErrors)[0];
			if (firstKey === 'sort_order') {
				document.getElementById('gallery-order')?.focus();
			} else if (firstKey) {
				document.getElementById(`gallery-${firstKey}`)?.focus();
			}
			return;
		}

		saving = true;
		try {
			if (image) {
				await api.patch<GalleryDto>(`/api/admin/gallery/${image.id}`, parsed.data);
				toast.success('Perubahan foto berhasil disimpan.');
			} else {
				await api.post<GalleryDto>('/api/admin/gallery', parsed.data);
				toast.success('Foto baru berhasil ditambahkan.');
			}
			await goto(resolve('/admin/gallery'));
		} catch (err) {
			serverError = err instanceof Error ? err.message : 'Gagal menyimpan foto.';
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

	<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
		<div class="space-y-5 rounded-lg bg-card p-5 shadow-card sm:p-6">
			<div class="space-y-1.5">
				<label for="gallery-alt" class="block text-sm font-medium text-foreground">
					Teks alternatif <span aria-hidden="true" class="text-destructive">*</span>
				</label>
				<input
					id="gallery-alt"
					type="text"
					bind:value={alt}
					maxlength={200}
					autocomplete="off"
					enterkeyhint="next"
					required
					aria-invalid={Boolean(fieldErrors.alt)}
					aria-describedby={`gallery-alt-hint${fieldErrors.alt ? ' gallery-alt-error' : ''}`}
					class="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
				/>
				<p id="gallery-alt-hint" class="text-xs text-muted-foreground">
					Jelaskan isi foto dalam satu kalimat, untuk pembaca layar.
				</p>
				{#if fieldErrors.alt}
					<p id="gallery-alt-error" role="alert" class="text-xs font-medium text-destructive">
						{fieldErrors.alt}
					</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				<label for="gallery-caption" class="block text-sm font-medium text-foreground">
					Keterangan
				</label>
				<input
					id="gallery-caption"
					type="text"
					bind:value={caption}
					maxlength={300}
					aria-invalid={Boolean(fieldErrors.caption)}
					aria-describedby={fieldErrors.caption ? 'gallery-caption-error' : undefined}
					class="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
				/>
				{#if fieldErrors.caption}
					<p id="gallery-caption-error" role="alert" class="text-xs font-medium text-destructive">
						{fieldErrors.caption}
					</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				<label for="gallery-order" class="block text-sm font-medium text-foreground">Urutan</label>
				<input
					id="gallery-order"
					type="number"
					inputmode="numeric"
					step={1}
					bind:value={sortOrder}
					aria-invalid={Boolean(fieldErrors.sort_order)}
					aria-describedby={`gallery-order-hint${fieldErrors.sort_order ? ' gallery-order-error' : ''}`}
					class="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive sm:max-w-40"
				/>
				<p id="gallery-order-hint" class="text-xs text-muted-foreground">
					Angka kecil tampil lebih dulu. Jika sama, foto terbaru dulu.
				</p>
				{#if fieldErrors.sort_order}
					<p id="gallery-order-error" role="alert" class="text-xs font-medium text-destructive">
						{fieldErrors.sort_order}
					</p>
				{/if}
			</div>
		</div>

		<div class="rounded-lg bg-card p-5 shadow-card sm:p-6">
			<ImageField
				value={url}
				onChange={(nextUrl) => (url = nextUrl)}
				folder="gallery"
				required
				error={fieldErrors.url}
				idPrefix="gallery-photo"
			/>
		</div>
	</div>

	<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
		<a
			href="/admin/gallery"
			class={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-11 px-4' })}
		>
			Batal
		</a>
		<Button type="submit" size="lg" class="h-11 px-4" disabled={saving}>
			{saving ? 'Menyimpan...' : image ? 'Simpan perubahan' : 'Tambah foto'}
		</Button>
	</div>
</form>
