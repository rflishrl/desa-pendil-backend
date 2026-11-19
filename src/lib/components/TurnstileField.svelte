<script lang="ts">
	import { PUBLIC_TURNSTILE_SITE_KEY } from '$app/env/public';
	import { onMount } from 'svelte';

	interface Props {
		action?: string;
		resetSignal?: number;
		class?: string;
		onTokenChange: (token: string | null) => void;
	}

	let { action = 'login', resetSignal = 0, class: className, onTokenChange }: Props = $props();

	let container = $state<HTMLDivElement | null>(null);
	let widgetId = $state<string | null>(null);
	let status = $state<'idle' | 'ready' | 'success' | 'error' | 'expired'>('idle');
	let theme = $state<'light' | 'dark'>('light');

	const TURNSTILE_SCRIPT_SRC =
		'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

	function syncTheme(): void {
		theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
	}

	function renderWidget(): void {
		if (!container || !window.turnstile || widgetId !== null) return;
		status = 'ready';
		widgetId = window.turnstile.render(container, {
			sitekey: PUBLIC_TURNSTILE_SITE_KEY,
			action,
			theme,
			callback: (token: string) => {
				status = 'success';
				onTokenChange(token);
			},
			'expired-callback': () => {
				status = 'expired';
				onTokenChange(null);
			},
			'error-callback': () => {
				status = 'error';
				onTokenChange(null);
			}
		});
	}

	onMount(() => {
		syncTheme();

		const observer = new MutationObserver(() => {
			syncTheme();
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		if (window.turnstile) {
			renderWidget();
		} else {
			let script = document.querySelector<HTMLScriptElement>(
				`script[src="${TURNSTILE_SCRIPT_SRC}"]`
			);
			const handleLoad = () => renderWidget();
			const handleError = () => {
				status = 'error';
				onTokenChange(null);
			};

			if (!script) {
				script = document.createElement('script');
				script.src = TURNSTILE_SCRIPT_SRC;
				script.async = true;
				script.defer = true;
				document.head.appendChild(script);
			}
			script.addEventListener('load', handleLoad);
			script.addEventListener('error', handleError);

			return () => {
				observer.disconnect();
				script?.removeEventListener('load', handleLoad);
				script?.removeEventListener('error', handleError);
				if (widgetId !== null && window.turnstile) {
					window.turnstile.remove(widgetId);
					widgetId = null;
				}
			};
		}

		return () => {
			observer.disconnect();
			if (widgetId !== null && window.turnstile) {
				window.turnstile.remove(widgetId);
				widgetId = null;
			}
		};
	});

	$effect(() => {
		if (resetSignal > 0 && widgetId !== null && window.turnstile) {
			status = 'idle';
			onTokenChange(null);
			window.turnstile.reset(widgetId);
		}
	});
</script>

<div
	class={className ?? 'flex flex-col items-center justify-center py-1'}
	role="region"
	aria-label="Verifikasi Keamanan Cloudflare Turnstile"
>
	<div class="cf-turnstile min-h-[65px]" bind:this={container}></div>
	{#if status === 'error'}
		<p class="mt-1 text-xs text-destructive" role="alert">
			Verifikasi keamanan gagal dimuat. Muat ulang halaman atau periksa koneksi Anda.
		</p>
	{/if}
	{#if status === 'expired'}
		<p class="mt-1 text-xs text-muted-foreground" role="alert">
			Verifikasi telah kedaluwarsa. Silakan lakukan verifikasi ulang.
		</p>
	{/if}
</div>
