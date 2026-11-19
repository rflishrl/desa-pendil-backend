<script lang="ts">
	import { CircleAlert, Eye, EyeOff } from '@lucide/svelte';
	import { tick } from 'svelte';

	import { api } from '#lib/api/client.js';
	import TurnstileField from '#lib/components/TurnstileField.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { type LoginResult, loginSchema } from '#lib/features/auth/schemas.js';

	let email = $state('');
	let password = $state('');
	let turnstileToken = $state<string | null>(null);
	let resetSignal = $state(0);
	let showPassword = $state(false);
	let submitting = $state(false);
	let serverError = $state<string | null>(null);
	let fieldErrors = $state<{ email?: string; password?: string; turnstileToken?: string }>({});
	let alertEl = $state<HTMLDivElement | null>(null);

	function handleTurnstileToken(token: string | null): void {
		turnstileToken = token;
		if (token && fieldErrors.turnstileToken) {
			fieldErrors = { ...fieldErrors, turnstileToken: undefined };
		}
	}

	async function handleSubmit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (submitting) return;

		serverError = null;
		fieldErrors = {};

		const token = turnstileToken ?? '';
		if (!token) {
			fieldErrors = { turnstileToken: 'Selesaikan verifikasi keamanan terlebih dahulu.' };
			return;
		}

		const parsed = loginSchema.safeParse({ email, password, turnstileToken: token });
		if (!parsed.success) {
			const nextErrors: { email?: string; password?: string; turnstileToken?: string } = {};
			for (const issue of parsed.error.issues) {
				const key = issue.path[0];
				if (key === 'email' && !nextErrors.email) nextErrors.email = issue.message;
				if (key === 'password' && !nextErrors.password) nextErrors.password = issue.message;
				if (key === 'turnstileToken' && !nextErrors.turnstileToken) {
					nextErrors.turnstileToken = issue.message;
				}
			}
			fieldErrors = nextErrors;
			return;
		}

		submitting = true;
		try {
			await api.post<LoginResult>('/api/auth/login', parsed.data);
			window.location.assign('/admin');
		} catch (err) {
			serverError = err instanceof Error ? err.message : 'Gagal masuk. Coba lagi.';
			resetSignal += 1;
			submitting = false;
			await tick();
			alertEl?.focus();
		}
	}
</script>

<form novalidate onsubmit={(e) => void handleSubmit(e)} class="space-y-5">
	{#if serverError}
		<div
			bind:this={alertEl}
			role="alert"
			tabindex="-1"
			class="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive outline-none"
		>
			<CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
			<p>{serverError}</p>
		</div>
	{/if}

	<div class="space-y-4">
		<div class="space-y-1.5">
			<label for="login-email" class="block text-sm font-medium text-foreground">Email</label>
			<input
				id="login-email"
				name="email"
				type="email"
				bind:value={email}
				autocomplete="username"
				autocapitalize="off"
				autocorrect="off"
				spellcheck="false"
				required
				aria-invalid={Boolean(fieldErrors.email)}
				aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
				class="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
			/>
			{#if fieldErrors.email}
				<p id="login-email-error" role="alert" class="text-xs font-medium text-destructive">
					{fieldErrors.email}
				</p>
			{/if}
		</div>

		<div class="space-y-1.5">
			<label for="login-password" class="block text-sm font-medium text-foreground">Password</label>
			<div class="relative">
				<input
					id="login-password"
					name="password"
					type={showPassword ? 'text' : 'password'}
					bind:value={password}
					autocomplete="current-password"
					enterkeyhint="go"
					required
					aria-invalid={Boolean(fieldErrors.password)}
					aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
					class="flex h-11 w-full rounded-md border border-input bg-card py-2 pr-11 pl-3 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onclick={() => (showPassword = !showPassword)}
					aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
					aria-pressed={showPassword}
					class="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
				>
					{#if showPassword}
						<EyeOff class="size-4" aria-hidden="true" />
					{:else}
						<Eye class="size-4" aria-hidden="true" />
					{/if}
				</Button>
			</div>
			{#if fieldErrors.password}
				<p id="login-password-error" role="alert" class="text-xs font-medium text-destructive">
					{fieldErrors.password}
				</p>
			{/if}
		</div>
	</div>

	<div class="space-y-1">
		<TurnstileField action="login" {resetSignal} onTokenChange={handleTurnstileToken} />
		{#if fieldErrors.turnstileToken}
			<p class="text-center text-xs text-destructive" role="alert">
				{fieldErrors.turnstileToken}
			</p>
		{/if}
	</div>

	<Button
		type="submit"
		size="lg"
		class="h-11 w-full"
		disabled={submitting || !turnstileToken}
		aria-disabled={submitting || !turnstileToken}
	>
		{submitting ? 'Memeriksa...' : 'Masuk'}
	</Button>
</form>
