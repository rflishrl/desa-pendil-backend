<script lang="ts">
	import { Search } from '@lucide/svelte';

	import Button from '#lib/components/ui/Button.svelte';
	import { buttonVariants } from '#lib/components/ui/button.js';

	interface Props {
		defaultValue: string;
		placeholder: string;
		clearHref: string;
	}

	let { defaultValue, placeholder, clearHref }: Props = $props();
</script>

<form method="get" role="search" class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
	<div class="relative w-full sm:max-w-md">
		<label for="q" class="sr-only">Cari</label>
		<Search
			aria-hidden="true"
			class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
		/>
		<input
			id="q"
			name="q"
			type="search"
			value={defaultValue}
			{placeholder}
			autocomplete="off"
			class="flex h-11 w-full rounded-md border border-input bg-card py-2 pr-3 pl-10 text-base shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
		/>
	</div>
	<div class="flex gap-2">
		<Button type="submit" size="lg" class="h-11 flex-1 px-4 sm:flex-none">Cari</Button>
		{#if defaultValue}
			<a
				href={clearHref}
				class={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-11 px-4' })}
			>
				Hapus pencarian
			</a>
		{/if}
	</div>
</form>
