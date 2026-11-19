<script lang="ts">
	import { CheckCircle2, Image as ImageIcon, Trash2, Upload } from '@lucide/svelte';
	import { onDestroy } from 'svelte';

	import { api } from '#lib/api/client.js';
	import Button from '#lib/components/ui/Button.svelte';
	import {
		ACCEPTED_IMAGE_TYPES,
		MAX_UPLOAD_MB,
		type UploadFolder,
		type UploadMetrics,
		type UploadResult
	} from '#lib/features/uploads/schemas.js';
	import { CLIENT_MAX_BYTES, prepareImageForUpload } from '#lib/image/prepare.js';
	import { toast } from '#lib/stores/toast.svelte.js';
	import { cn } from '#lib/utils.js';

	export interface Props {
		value: string;
		onChange: (url: string) => void;
		folder: UploadFolder;
		required?: boolean;
		error?: string;
		idPrefix?: string;
	}

	let {
		value,
		onChange,
		folder,
		required = false,
		error,
		idPrefix = 'image-upload'
	}: Props = $props();

	type UploadStage = 'idle' | 'preparing' | 'uploading';

	let inputEl = $state<HTMLInputElement | null>(null);
	let isDragging = $state(false);
	let stage = $state<UploadStage>('idle');
	let progress = $state(0);
	let localError = $state<string | null>(null);
	let statusAnnouncement = $state('');
	let localPreviewUrl = $state<string | null>(null);
	let lastMetrics = $state<{
		originalSize: number;
		sourceLabel: string;
		metrics: UploadMetrics;
	} | null>(null);

	let urlId = $derived(`${idPrefix}-url`);
	let fileInputId = $derived(`${idPrefix}-file`);
	let progressLabelId = $derived(`${idPrefix}-progress`);
	let busy = $derived(stage !== 'idle');
	let activePreviewSrc = $derived(localPreviewUrl || value);
	let savedPercent = $derived(
		lastMetrics && lastMetrics.originalSize > 0
			? Math.max(
					0,
					Math.round(
						((lastMetrics.originalSize - lastMetrics.metrics.totalCompressedSize) /
							lastMetrics.originalSize) *
							100
					)
				)
			: 0
	);

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		const kb = bytes / 1024;
		if (kb < 1024) return `${Math.round(kb)} KB`;
		return `${(kb / 1024).toFixed(1)} MB`;
	}

	function getSourceFormatLabel(mimeType: string): string {
		switch (mimeType.toLowerCase()) {
			case 'image/png':
				return 'PNG';
			case 'image/jpeg':
				return 'JPG';
			case 'image/webp':
				return 'WebP';
			default:
				return 'Asli';
		}
	}

	function revokePreviewUrl(): void {
		if (localPreviewUrl) {
			URL.revokeObjectURL(localPreviewUrl);
			localPreviewUrl = null;
		}
	}

	onDestroy(() => {
		revokePreviewUrl();
	});

	async function handleFile(file: File | undefined): Promise<void> {
		if (!file || busy) return;

		if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
			const msg = 'Format file harus JPG, PNG, atau WebP statis.';
			localError = msg;
			statusAnnouncement = msg;
			toast.error(msg);
			if (inputEl) inputEl.value = '';
			return;
		}

		localError = null;
		lastMetrics = null;
		progress = 0;

		revokePreviewUrl();
		localPreviewUrl = URL.createObjectURL(file);

		const originalSize = file.size;
		const sourceLabel = getSourceFormatLabel(file.type);

		let fileToSend = file;
		if (originalSize > CLIENT_MAX_BYTES) {
			stage = 'preparing';
			statusAnnouncement = 'Menyiapkan gambar...';
			try {
				const prepared = await prepareImageForUpload(file);
				fileToSend = prepared.file;
			} catch (err) {
				const msg = err instanceof Error ? err.message : 'Gagal menyiapkan gambar di browser.';
				revokePreviewUrl();
				stage = 'idle';
				localError = msg;
				statusAnnouncement = msg;
				toast.error(msg);
				if (inputEl) inputEl.value = '';
				return;
			}
		}

		stage = 'uploading';
		statusAnnouncement = 'Mengunggah dan mengonversi ke WebP...';

		try {
			const form = new FormData();
			form.set('folder', folder);
			form.set('file', fileToSend);

			const result = await api.upload<UploadResult>('/api/upload', form, {
				onProgress: (pct) => {
					progress = pct;
				}
			});

			revokePreviewUrl();
			onChange(result.url);
			if (result.metrics) {
				lastMetrics = { originalSize, sourceLabel, metrics: result.metrics };
			}
			statusAnnouncement = 'Foto berhasil diunggah dan dikonversi ke WebP.';
			toast.success('Foto berhasil diunggah.');
		} catch (err) {
			revokePreviewUrl();
			const msg = err instanceof Error ? err.message : 'Gagal mengunggah foto.';
			localError = msg;
			statusAnnouncement = msg;
			toast.error(msg);
		} finally {
			stage = 'idle';
			progress = 0;
			if (inputEl) inputEl.value = '';
		}
	}

	function handleDragOver(e: DragEvent): void {
		e.preventDefault();
		e.stopPropagation();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent): void {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;
	}

	function handleDrop(e: DragEvent): void {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;
		if (busy) return;
		const file = e.dataTransfer?.files?.[0];
		if (file) void handleFile(file);
	}

	function handlePaste(e: ClipboardEvent): void {
		if (busy) return;
		const file = e.clipboardData?.files?.[0];
		if (file) void handleFile(file);
	}

	function handleClearPhoto(): void {
		revokePreviewUrl();
		lastMetrics = null;
		localError = null;
		onChange('');
		statusAnnouncement = 'Foto dihapus dari formulir.';
	}
</script>

<fieldset class="space-y-4">
	<legend class="text-sm font-semibold text-foreground">
		Foto
		{#if required}
			<span aria-hidden="true" class="text-destructive"> *</span>
		{/if}
	</legend>

	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		onpaste={handlePaste}
		tabindex="0"
		role="region"
		aria-label="Area pratinjau dan drag-and-drop foto"
		class={cn(
			'relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-ring',
			isDragging ? 'border-brand bg-brand/10 ring-2 ring-brand' : 'bg-card'
		)}
	>
		{#if isDragging}
			<div
				class="flex size-full flex-col items-center justify-center gap-2 bg-brand/15 px-4 text-center text-sm font-semibold text-brand-strong"
			>
				<Upload aria-hidden="true" class="size-8" />
				Lepaskan file foto di sini
			</div>
		{:else if activePreviewSrc}
			<img src={activePreviewSrc} alt="Pratinjau foto" class="size-full object-cover" />
		{:else}
			<div
				class="flex size-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground"
			>
				<ImageIcon aria-hidden="true" class="size-8" />
				<span>Belum ada foto</span>
				<span class="text-xs text-muted-foreground">
					Seret dan lepas berkas atau tempel (Ctrl+V) di sini
				</span>
			</div>
		{/if}
	</div>

	{#if busy}
		<div class="space-y-1.5 rounded-md border bg-muted/40 p-3">
			<div class="flex items-center justify-between gap-2 text-xs font-medium text-foreground">
				<span id={progressLabelId}>
					{stage === 'preparing' ? 'Menyiapkan gambar...' : 'Mengunggah dan mengonversi ke WebP...'}
				</span>
				{#if stage === 'uploading'}
					<span class="text-muted-foreground tabular-nums">{progress}%</span>
				{/if}
			</div>
			{#if stage === 'preparing'}
				<progress
					aria-labelledby={progressLabelId}
					class="h-2 w-full overflow-hidden rounded-full accent-brand-strong"
				></progress>
			{:else}
				<progress
					aria-labelledby={progressLabelId}
					value={progress}
					max={100}
					class="h-2 w-full overflow-hidden rounded-full accent-brand-strong"
				></progress>
			{/if}
		</div>
	{/if}

	{#if lastMetrics && !busy}
		<div
			class="flex items-start gap-2 rounded-md border border-success/25 bg-success-soft px-3 py-2 text-xs font-medium text-success dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300"
		>
			<CheckCircle2 aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
			<span class="tabular-nums">
				{formatFileSize(lastMetrics.originalSize)}
				{lastMetrics.sourceLabel} -&gt; {formatFileSize(lastMetrics.metrics.fullSize)} +
				{formatFileSize(lastMetrics.metrics.thumbSize)} WebP{savedPercent > 0
					? ` • Hemat ${savedPercent}%`
					: ''}
			</span>
		</div>
	{/if}

	<p role="status" aria-live="polite" class="sr-only">
		{statusAnnouncement}
	</p>

	<div class="flex flex-wrap gap-2">
		<input
			bind:this={inputEl}
			id={fileInputId}
			type="file"
			accept={ACCEPTED_IMAGE_TYPES.join(',')}
			class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-background focus:p-2 focus:shadow"
			aria-label="Pilih file foto"
			onchange={(event) => void handleFile((event.currentTarget as HTMLInputElement).files?.[0])}
		/>
		<Button
			type="button"
			variant="outline"
			size="lg"
			class="h-11 px-4"
			onclick={() => inputEl?.click()}
			disabled={busy}
		>
			<Upload class="size-4" aria-hidden="true" />
			{#if busy}
				{stage === 'preparing' ? 'Menyiapkan...' : 'Mengunggah...'}
			{:else}
				{value ? 'Ganti foto' : 'Pilih foto'}
			{/if}
		</Button>
		{#if value}
			<Button
				type="button"
				variant="ghost"
				size="lg"
				class="h-11 px-4"
				onclick={handleClearPhoto}
				disabled={busy}
			>
				<Trash2 class="size-4" aria-hidden="true" />
				Hapus foto
			</Button>
		{/if}
	</div>

	<p class="text-xs text-muted-foreground">
		JPG, PNG, atau WebP statis. Maksimal {MAX_UPLOAD_MB} MB (otomatis dikompres ke WebP).
	</p>

	{#if localError}
		<p role="alert" class="text-sm font-medium text-destructive">
			{localError}
		</p>
	{/if}

	<div class="space-y-1.5">
		<label for={urlId} class="block text-sm font-medium text-foreground">
			Atau tempel alamat foto yang sudah diunggah
		</label>
		<input
			id={urlId}
			type="url"
			inputmode="url"
			autocorrect="off"
			autocapitalize="none"
			spellcheck="false"
			{value}
			oninput={(event) => {
				lastMetrics = null;
				onChange((event.currentTarget as HTMLInputElement).value);
			}}
			placeholder="https://..."
			aria-invalid={Boolean(error)}
			aria-describedby={`${urlId}-hint${error ? ` ${urlId}-error` : ''}`}
			class="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
		/>
		<p id={`${urlId}-hint`} class="text-xs text-muted-foreground">
			Mendukung alamat media R2 aplikasi.
		</p>
		{#if error}
			<p id={`${urlId}-error`} role="alert" class="text-xs font-medium text-destructive">
				{error}
			</p>
		{/if}
	</div>
</fieldset>
