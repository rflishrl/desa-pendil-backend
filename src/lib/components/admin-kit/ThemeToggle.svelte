<script lang="ts">
	import { onMount } from 'svelte';
	import { Monitor, Moon, Sun } from '@lucide/svelte';

	import { buttonVariants } from '#lib/components/ui/button.js';

	type ThemeMode = 'light' | 'dark' | 'system';

	let theme = $state<ThemeMode>('system');
	let resolvedDark = $state(false);
	let open = $state(false);
	let menuRef = $state<HTMLDivElement | null>(null);

	function applyTheme(mode: ThemeMode): void {
		const root = document.documentElement;
		const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		const isDark = mode === 'dark' || (mode === 'system' && systemDark);
		root.classList.toggle('dark', isDark);
		root.style.colorScheme = isDark ? 'dark' : 'light';
		resolvedDark = isDark;
	}

	function selectTheme(mode: ThemeMode): void {
		theme = mode;
		try {
			localStorage.setItem('theme', mode);
		} catch {
			// Ignore storage failures in restricted contexts
		}
		applyTheme(mode);
		open = false;
	}

	onMount(() => {
		try {
			const stored = localStorage.getItem('theme');
			if (stored === 'light' || stored === 'dark' || stored === 'system') {
				theme = stored;
			}
		} catch {
			// Ignore storage failures
		}
		applyTheme(theme);

		const media = window.matchMedia('(prefers-color-scheme: dark)');
		const onMediaChange = () => {
			if (theme === 'system') applyTheme('system');
		};
		const onDocClick = (event: MouseEvent) => {
			if (open && menuRef && !menuRef.contains(event.target as Node)) {
				open = false;
			}
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && open) open = false;
		};

		media.addEventListener('change', onMediaChange);
		document.addEventListener('click', onDocClick);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			media.removeEventListener('change', onMediaChange);
			document.removeEventListener('click', onDocClick);
			document.removeEventListener('keydown', onKeyDown);
		};
	});
</script>

<div class="relative" bind:this={menuRef}>
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-label="Pilih tema tampilan"
		aria-expanded={open}
		aria-haspopup="menu"
		class={buttonVariants({
			variant: 'ghost',
			size: 'icon',
			className: 'size-9 text-muted-foreground hover:text-foreground'
		})}
	>
		{#if resolvedDark}
			<Moon class="size-4" aria-hidden="true" />
		{:else}
			<Sun class="size-4" aria-hidden="true" />
		{/if}
		<span class="sr-only">Pilih tema</span>
	</button>

	{#if open}
		<div
			role="menu"
			class="absolute right-0 z-50 mt-1.5 w-32 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
		>
			<button
				type="button"
				role="menuitemradio"
				aria-checked={theme === 'light'}
				onclick={() => selectTheme('light')}
				class="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
			>
				<Sun class="size-4" aria-hidden="true" />
				<span>Terang</span>
			</button>
			<button
				type="button"
				role="menuitemradio"
				aria-checked={theme === 'dark'}
				onclick={() => selectTheme('dark')}
				class="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
			>
				<Moon class="size-4" aria-hidden="true" />
				<span>Gelap</span>
			</button>
			<button
				type="button"
				role="menuitemradio"
				aria-checked={theme === 'system'}
				onclick={() => selectTheme('system')}
				class="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
			>
				<Monitor class="size-4" aria-hidden="true" />
				<span>Sistem</span>
			</button>
		</div>
	{/if}
</div>
