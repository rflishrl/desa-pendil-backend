<script lang="ts">
	import type { Snippet } from 'svelte';
	import '@fontsource-variable/mulish';
	import '@fontsource-variable/open-sans';
	import '../styles/globals.css';

	import Toaster from '#lib/components/ui/Toaster.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<title>Panel Admin | Desa Pendil</title>
	<meta name="description" content="Kelola berita, artikel, postingan, dan galeri Desa Pendil." />
</svelte:head>

<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
>
	Lewati ke konten utama
</a>

{@render children()}
<Toaster />
