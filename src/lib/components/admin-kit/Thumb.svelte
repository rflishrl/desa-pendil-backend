<script lang="ts">
	import { cn } from '#lib/utils.js';

	interface Props {
		src: string;
		class?: string;
		priority?: boolean;
	}

	let { src, class: className, priority = false }: Props = $props();
</script>

{#if src}
	<img
		{src}
		alt=""
		width={56}
		height={56}
		loading={priority ? 'eager' : 'lazy'}
		fetchpriority={priority ? 'high' : 'auto'}
		decoding="async"
		class={cn('size-14 shrink-0 rounded-md object-cover', className)}
	/>
{:else}
	<div
		aria-label="Tanpa foto"
		role="img"
		class={cn(
			'flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground',
			className
		)}
	>
		-
	</div>
{/if}
