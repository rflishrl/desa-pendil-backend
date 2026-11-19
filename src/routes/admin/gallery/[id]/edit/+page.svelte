<script lang="ts">
	import PageHeading from '#lib/components/admin-kit/PageHeading.svelte';
	import GalleryForm from '#lib/features/gallery/components/GalleryForm.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Ubah Foto | Panel Admin Desa Pendil</title>
</svelte:head>

<div class="space-y-6">
	<PageHeading title="Ubah foto" description={data.image.alt} />
	<GalleryForm image={data.image} />
</div>
