<script lang="ts">
	import { Trash2 } from '@lucide/svelte';

	import Button from '#lib/components/ui/Button.svelte';

	interface Props {
		itemName: string;
		onConfirm: () => Promise<unknown>;
	}

	let { itemName, onConfirm }: Props = $props();

	let dialogEl = $state<HTMLDialogElement | null>(null);
	let deleting = $state(false);
	let error = $state<string | undefined>(undefined);

	function openDialog(): void {
		error = undefined;
		if (dialogEl && !dialogEl.open) {
			dialogEl.showModal();
		}
	}

	function closeDialog(): void {
		if (deleting) return;
		if (dialogEl?.open) {
			dialogEl.close();
		}
	}

	function handleCancel(event: Event): void {
		if (deleting) {
			event.preventDefault();
		}
	}

	function handleBackdropClick(event: MouseEvent): void {
		if (event.target === dialogEl && !deleting) {
			closeDialog();
		}
	}

	async function confirm(): Promise<void> {
		deleting = true;
		error = undefined;
		try {
			await onConfirm();
			if (dialogEl?.open) dialogEl.close();
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'Gagal menghapus. Coba lagi.';
		} finally {
			deleting = false;
		}
	}
</script>

<Button
	variant="ghost"
	size="lg"
	class="h-11 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
	aria-label={`Hapus ${itemName}`}
	onclick={openDialog}
>
	<Trash2 class="size-4" aria-hidden="true" />
	<span class="hidden sm:inline">Hapus</span>
</Button>

<dialog
	bind:this={dialogEl}
	oncancel={handleCancel}
	onclick={handleBackdropClick}
	class="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-xl backdrop:bg-black/55 backdrop:backdrop-blur-[1px]"
>
	<div class="space-y-2">
		<h2 class="font-heading text-lg font-bold text-foreground">Hapus &ldquo;{itemName}&rdquo;?</h2>
		<p class="text-sm text-muted-foreground">
			Data dan fotonya akan dihapus permanen dan tidak bisa dikembalikan.
		</p>
	</div>

	{#if error}
		<p role="alert" class="mt-3 text-sm font-medium text-destructive">
			{error}
		</p>
	{/if}

	<div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
		<Button variant="outline" class="h-11" disabled={deleting} onclick={closeDialog}>Batal</Button>
		<Button
			variant="destructive"
			class="h-11 bg-destructive text-white hover:bg-destructive/90"
			disabled={deleting}
			onclick={() => void confirm()}
		>
			{deleting ? 'Menghapus...' : 'Ya, hapus'}
		</Button>
	</div>
</dialog>
