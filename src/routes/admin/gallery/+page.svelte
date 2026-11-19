<script lang="ts">
	import { Plus } from '@lucide/svelte';

	import PageHeading from '#lib/components/admin-kit/PageHeading.svelte';
	import { buttonVariants } from '#lib/components/ui/button.js';
	import GalleryListView from '#lib/features/gallery/components/GalleryListView.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Galeri | Panel Admin Desa Pendil</title>
</svelte:head>

<div class="space-y-6">
	<PageHeading title="Galeri" description="Kelola foto yang tampil di Galeri Desa.">
		{#snippet action()}
			<a href="/admin/gallery/new" class={buttonVariants({ size: 'lg', className: 'h-11 px-4' })}>
				<Plus class="size-4" aria-hidden="true" />
				Unggah foto
			</a>
		{/snippet}
	</PageHeading>
	<GalleryListView list={data.list} />
</div>
