<script lang="ts">
	import PageHeading from '#lib/components/admin-kit/PageHeading.svelte';
	import GalleryForm from '#lib/features/gallery/components/GalleryForm.svelte';
</script>

<svelte:head>
	<title>Unggah Foto | Panel Admin Desa Pendil</title>
</svelte:head>

<div class="space-y-6">
	<PageHeading title="Unggah foto" />
	<GalleryForm />
</div>
