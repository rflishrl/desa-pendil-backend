<script lang="ts">
	interface Props {
		rows?: number;
	}

	let { rows = 5 }: Props = $props();
</script>

<div role="status" aria-label="Memuat data" class="space-y-3 rounded-lg bg-card p-4 shadow-card">
	{#each Array.from({ length: rows }, (_, i) => i) as idx (idx)}
		<div class="flex items-center gap-3">
			<div class="size-14 animate-pulse rounded-md bg-muted"></div>
			<div class="flex-1 space-y-2">
				<div class="h-4 w-1/2 animate-pulse rounded bg-muted"></div>
				<div class="h-4 w-1/4 animate-pulse rounded bg-muted"></div>
			</div>
			<div class="h-11 w-20 animate-pulse rounded bg-muted"></div>
		</div>
	{/each}
</div>
