<script lang="ts">
	import { page } from '$app/state';

	import { buttonVariants } from '#lib/components/ui/button.js';

	let isNotFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{isNotFound ? '404 — Halaman Tidak Ditemukan' : 'Error'} | Panel Admin Desa Pendil</title>
</svelte:head>

<main
	id="main-content"
	class="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center"
>
	{#if isNotFound}
		<p class="text-sm font-semibold tracking-wide text-brand-strong uppercase">404</p>
		<h1 class="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
			Halaman tidak ditemukan
		</h1>
		<p class="mt-2 max-w-md text-sm text-muted-foreground">
			Halaman yang Anda tuju tidak tersedia atau telah dipindahkan.
		</p>
		<div class="mt-6">
			<a href="/admin" class={buttonVariants()}>Kembali ke Dashboard</a>
		</div>
	{:else}
		<p class="text-sm font-semibold tracking-wide text-destructive uppercase">Error</p>
		<h1 class="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
			Terjadi kesalahan sistem
		</h1>
		<p class="mt-2 max-w-md text-sm text-muted-foreground">
			{page.error?.message || 'Gagal memuat halaman. Silakan coba lagi.'}
		</p>
		<div class="mt-6 flex gap-2">
			<a href="/admin" class={buttonVariants({ variant: 'outline' })}>Kembali ke Dashboard</a>
		</div>
	{/if}
</main>
