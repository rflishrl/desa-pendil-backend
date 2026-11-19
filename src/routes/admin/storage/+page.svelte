<script lang="ts">
	import PageHeading from '#lib/components/admin-kit/PageHeading.svelte';
	import MediaStorageDashboard from '#lib/features/uploads/components/MediaStorageDashboard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Penyimpanan Media | Panel Admin Desa Pendil</title>
</svelte:head>

<div class="space-y-6">
	<PageHeading
		title="Penyimpanan Media R2"
		description="Pantau pemakaian kuota, komposisi gambar WebP, dan status aset media aplikasi dari database."
	/>
	<MediaStorageDashboard summary={data.summary} />
</div>
