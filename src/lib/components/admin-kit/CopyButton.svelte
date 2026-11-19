<script lang="ts">
	import { Check, Copy } from '@lucide/svelte';

	import Button from '#lib/components/ui/Button.svelte';
	import { toast } from '#lib/stores/toast.svelte.js';

	interface Props {
		value: string;
		label?: string;
		class?: string;
	}

	let { value, label, class: className }: Props = $props();
	let copied = $state(false);

	async function handleCopy(): Promise<void> {
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			toast.success(`Tersalin: ${value}`);
			window.setTimeout(() => {
				copied = false;
			}, 1500);
		} catch {
			toast.error('Gagal menyalin ke clipboard');
		}
	}
</script>

<Button
	type="button"
	variant="ghost"
	size="icon-xs"
	onclick={() => void handleCopy()}
	aria-label={`Salin ${label ?? value}`}
	class={className}
>
	{#if copied}
		<Check class="size-3 text-success" aria-hidden="true" />
	{:else}
		<Copy class="size-3 text-muted-foreground hover:text-foreground" aria-hidden="true" />
	{/if}
</Button>
