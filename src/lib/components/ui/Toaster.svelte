<script lang="ts">
	import { CheckCircle2, CircleAlert, Info, X } from '@lucide/svelte';

	import { toast } from '#lib/stores/toast.svelte.js';
	import { cn } from '#lib/utils.js';
</script>

{#if toast.items.length > 0}
	<div
		aria-live="polite"
		aria-label="Notifikasi"
		class="pointer-events-none fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
	>
		{#each toast.items as item (item.id)}
			<div
				class={cn(
					'pointer-events-auto flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm shadow-lg',
					item.kind === 'success' &&
						'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800/70 dark:bg-emerald-950 dark:text-emerald-100',
					item.kind === 'error' &&
						'border-destructive/40 bg-red-50 text-red-950 dark:border-red-800/70 dark:bg-red-950 dark:text-red-100',
					item.kind === 'info' && 'border-border bg-card text-foreground'
				)}
			>
				{#if item.kind === 'success'}
					<CheckCircle2
						class="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
						aria-hidden="true"
					/>
				{:else if item.kind === 'error'}
					<CircleAlert class="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
				{:else}
					<Info class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
				{/if}
				<p class="flex-1 leading-snug font-medium">{item.message}</p>
				<button
					type="button"
					onclick={() => toast.dismiss(item.id)}
					class="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					aria-label="Tutup notifikasi"
				>
					<X class="size-4" aria-hidden="true" />
				</button>
			</div>
		{/each}
	</div>
{/if}
