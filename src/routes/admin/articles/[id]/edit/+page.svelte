<script lang="ts">
	import PageHeading from '#lib/components/admin-kit/PageHeading.svelte';
	import ArticleForm from '#lib/features/articles/components/ArticleForm.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Ubah Konten | Panel Admin Desa Pendil</title>
</svelte:head>

<div class="space-y-6">
	<PageHeading title="Ubah konten" description={data.article.title} />
	<ArticleForm article={data.article} />
</div>
