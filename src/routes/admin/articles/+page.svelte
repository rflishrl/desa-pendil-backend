<script lang="ts">
	import { Plus } from '@lucide/svelte';

	import PageHeading from '#lib/components/admin-kit/PageHeading.svelte';
	import SearchForm from '#lib/components/admin-kit/SearchForm.svelte';
	import { buttonVariants } from '#lib/components/ui/button.js';
	import ArticleListView from '#lib/features/articles/components/ArticleListView.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Konten | Panel Admin Desa Pendil</title>
</svelte:head>

<div class="space-y-6">
	<PageHeading title="Konten" description="Kelola berita, artikel, dan postingan Desa Pendil.">
		{#snippet action()}
			<a href="/admin/articles/new" class={buttonVariants({ size: 'lg', className: 'h-11 px-4' })}>
				<Plus class="size-4" aria-hidden="true" />
				Tambah konten
			</a>
		{/snippet}
	</PageHeading>
	<SearchForm defaultValue={data.q} placeholder="Cari judul..." clearHref="/admin/articles" />
	<ArticleListView list={data.list} q={data.q} />
</div>
