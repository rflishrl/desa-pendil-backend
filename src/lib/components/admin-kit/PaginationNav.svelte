<script lang="ts">
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import type { Pagination } from '#lib/api/types.js';
	import { buttonVariants } from '#lib/components/ui/button.js';

	interface Props {
		pagination: Pagination;
		basePath: string;
		q?: string;
	}

	let { pagination, basePath, q = '' }: Props = $props();

	let page = $derived(pagination.page);
	let total = $derived(pagination.total);
	let totalPages = $derived(Math.max(1, pagination.totalPages));

	function href(target: number): string {
		const params = new SvelteURLSearchParams();
		if (q) params.set('q', q);
		if (target > 1) params.set('page', String(target));
		const query = params.toString();
		return query ? `${basePath}?${query}` : basePath;
	}
</script>

<nav
	aria-label="Halaman"
	class="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground"
>
	<p>
		{total} data &middot; halaman {page} dari {totalPages}
	</p>
	<div class="flex gap-2">
		{#if page > 1}
			<a
				href={href(page - 1)}
				rel="prev"
				class={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-11 px-3' })}
			>
				<ChevronLeft class="size-4" aria-hidden="true" />
				Sebelumnya
			</a>
		{/if}
		{#if page < totalPages}
			<a
				href={href(page + 1)}
				rel="next"
				class={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-11 px-3' })}
			>
				Berikutnya
				<ChevronRight class="size-4" aria-hidden="true" />
			</a>
		{/if}
	</div>
</nav>
