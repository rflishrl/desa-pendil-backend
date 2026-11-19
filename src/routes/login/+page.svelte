<script lang="ts">
	import ThemeToggle from '#lib/components/admin-kit/ThemeToggle.svelte';
	import LoginForm from '#lib/features/auth/components/LoginForm.svelte';
</script>

<svelte:head>
	<title>Masuk | Panel Admin Desa Pendil</title>
</svelte:head>

<main
	id="main-content"
	class="relative flex min-h-dvh items-center justify-center bg-background px-4 py-10 transition-colors"
>
	<div class="absolute top-4 right-4 sm:top-6 sm:right-6">
		<ThemeToggle />
	</div>

	<div
		class="w-full max-w-md rounded-xl border border-border/80 bg-card text-card-foreground shadow-lg"
	>
		<div class="space-y-3 p-6 pb-6">
			<div class="flex items-center gap-3">
				<span
					aria-hidden="true"
					class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand font-heading text-lg font-extrabold text-ink shadow-xs"
				>
					DP
				</span>
				<div>
					<h1 class="font-heading text-xl font-extrabold tracking-wide text-foreground uppercase">
						Desa Pendil
					</h1>
					<p class="text-sm text-muted-foreground">Masuk ke panel admin</p>
				</div>
			</div>
		</div>
		<div class="px-6 pb-6">
			<LoginForm />
		</div>
	</div>
</main>
