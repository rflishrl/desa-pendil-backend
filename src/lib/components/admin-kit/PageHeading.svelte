<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		action?: Snippet;
	}

	let { title, description, action }: Props = $props();
</script>

<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
	<div>
		<h1 class="font-heading text-2xl font-extrabold text-balance sm:text-3xl">{title}</h1>
		{#if description}
			<p class="mt-1 max-w-2xl text-pretty text-muted-foreground">{description}</p>
		{/if}
	</div>
	{#if action}
		<div class="shrink-0">
			{@render action()}
		</div>
	{/if}
</div>
