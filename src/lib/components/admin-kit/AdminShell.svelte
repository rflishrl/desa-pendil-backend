<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import {
		ChevronRight,
		EllipsisVertical,
		ExternalLink,
		HardDrive,
		Images,
		LayoutDashboard,
		LogOut,
		Menu,
		Newspaper,
		PanelLeft,
		X
	} from '@lucide/svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';

	import { api } from '#lib/api/client.js';
	import ThemeToggle from '#lib/components/admin-kit/ThemeToggle.svelte';
	import { buttonVariants } from '#lib/components/ui/button.js';
	import { toast } from '#lib/stores/toast.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		email: string;
		frontendUrl?: string;
		children: Snippet;
	}

	const DEFAULT_SITE_URL = 'https://desa-pendil.vercel.app/';

	let { email, frontendUrl, children }: Props = $props();

	const NAV_ITEMS = [
		{ label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
		{ label: 'Konten', href: '/admin/articles', icon: Newspaper },
		{ label: 'Galeri', href: '/admin/gallery', icon: Images },
		{ label: 'Penyimpanan', href: '/admin/storage', icon: HardDrive }
	] as const;

	let collapsed = $state(false);
	let mobileDrawer = $state<HTMLDialogElement | null>(null);
	let mobileOpen = $state(false);
	let headerMenuOpen = $state(false);
	let footerMenuOpen = $state(false);
	let headerMenuRef = $state<HTMLDivElement | null>(null);
	let footerMenuRef = $state<HTMLDivElement | null>(null);
	let loggingOut = $state(false);

	let pathname = $derived(page.url.pathname);
	let siteUrl = $derived(
		frontendUrl && frontendUrl !== 'http://localhost:3000' ? frontendUrl : DEFAULT_SITE_URL
	);
	let initials = $derived(
		email ? (email.split('@')[0] ?? 'Admin').slice(0, 2).toUpperCase() : 'DP'
	);

	function isNavActive(href: string): boolean {
		if (href === '/admin') return pathname === href;
		return pathname === href || pathname.startsWith(`${href}/`);
	}

	let breadcrumbs = $derived.by(() => {
		if (pathname === '/admin') {
			return [{ label: 'Dashboard', href: '/admin', isCurrent: true }];
		}

		const crumbs: { label: string; href?: string; isCurrent: boolean }[] = [
			{ label: 'Dashboard', href: '/admin', isCurrent: false }
		];

		if (pathname.startsWith('/admin/articles')) {
			const isIndex = pathname === '/admin/articles';
			crumbs.push({
				label: 'Konten',
				href: isIndex ? undefined : '/admin/articles',
				isCurrent: isIndex
			});
			if (pathname === '/admin/articles/new') {
				crumbs.push({ label: 'Tambah Konten', isCurrent: true });
			} else if (pathname.endsWith('/edit')) {
				crumbs.push({ label: 'Ubah Konten', isCurrent: true });
			}
		} else if (pathname.startsWith('/admin/gallery')) {
			const isIndex = pathname === '/admin/gallery';
			crumbs.push({
				label: 'Galeri',
				href: isIndex ? undefined : '/admin/gallery',
				isCurrent: isIndex
			});
			if (pathname === '/admin/gallery/new') {
				crumbs.push({ label: 'Tambah Foto', isCurrent: true });
			} else if (pathname.endsWith('/edit')) {
				crumbs.push({ label: 'Ubah Foto', isCurrent: true });
			}
		} else if (pathname.startsWith('/admin/storage')) {
			crumbs.push({ label: 'Penyimpanan', isCurrent: true });
		}

		return crumbs;
	});

	function openMobileDrawer(): void {
		if (!mobileDrawer) return;
		mobileOpen = true;
		if (!mobileDrawer.open) mobileDrawer.showModal();
	}

	function closeMobileDrawer(): void {
		mobileOpen = false;
		if (mobileDrawer?.open) mobileDrawer.close();
	}

	afterNavigate(() => {
		closeMobileDrawer();
		headerMenuOpen = false;
		footerMenuOpen = false;
	});

	async function handleLogout(): Promise<void> {
		if (loggingOut) return;
		loggingOut = true;
		try {
			await api.post('/api/auth/logout');
			toast.success('Anda telah keluar.');
			window.location.assign('/login');
		} catch (err) {
			loggingOut = false;
			toast.error(err instanceof Error ? err.message : 'Gagal keluar dari sesi.');
		}
	}

	onMount(() => {
		const onDocClick = (event: MouseEvent) => {
			const target = event.target as Node;
			if (headerMenuOpen && headerMenuRef && !headerMenuRef.contains(target)) {
				headerMenuOpen = false;
			}
			if (footerMenuOpen && footerMenuRef && !footerMenuRef.contains(target)) {
				footerMenuOpen = false;
			}
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				headerMenuOpen = false;
				footerMenuOpen = false;
			}
		};
		document.addEventListener('click', onDocClick);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('click', onDocClick);
			document.removeEventListener('keydown', onKeyDown);
		};
	});
</script>

<div class="flex min-h-dvh bg-background">
	<!-- Desktop Sidebar -->
	<aside
		class={cn(
			'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex',
			collapsed ? 'w-16' : 'w-64'
		)}
	>
		<div class="flex h-14 items-center border-b border-sidebar-border/60 px-3">
			<a
				href="/admin"
				class="flex w-full items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
			>
				<div
					class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand font-heading text-sm font-extrabold text-ink shadow-xs"
				>
					DP
				</div>
				{#if !collapsed}
					<div class="grid min-w-0 flex-1 text-left text-sm leading-tight">
						<span class="truncate font-heading text-base font-extrabold text-sidebar-foreground">
							Desa Pendil
						</span>
						<span class="truncate text-xs font-medium text-sidebar-foreground/65">
							Panel Admin
						</span>
					</div>
				{/if}
			</a>
		</div>

		<nav aria-label="Menu Utama" class="flex-1 overflow-y-auto px-2 py-3">
			{#if !collapsed}
				<p class="px-2 pb-1.5 text-xs font-medium text-sidebar-foreground/60">Menu Utama</p>
			{/if}
			<ul class="space-y-1">
				{#each NAV_ITEMS as item (item.href)}
					{@const active = isNavActive(item.href)}
					{@const Icon = item.icon}
					<li>
						<a
							href={item.href}
							aria-current={active ? 'page' : undefined}
							title={collapsed ? item.label : undefined}
							class={cn(
								'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
								collapsed && 'justify-center px-0',
								active
									? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-xs'
									: 'text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
							)}
						>
							<Icon class="size-4 shrink-0" aria-hidden="true" />
							{#if !collapsed}
								<span class="truncate">{item.label}</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<div class="border-t border-sidebar-border/60 p-2" bind:this={footerMenuRef}>
			<div class="relative">
				<button
					type="button"
					onclick={() => (footerMenuOpen = !footerMenuOpen)}
					aria-expanded={footerMenuOpen}
					aria-haspopup="menu"
					aria-label="Menu akun"
					class={cn(
						'flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
						collapsed && 'justify-center px-0'
					)}
				>
					<span
						class="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand-strong"
					>
						{initials}
					</span>
					{#if !collapsed}
						<div class="grid min-w-0 flex-1 text-sm leading-tight">
							<span class="truncate font-semibold text-sidebar-foreground">Admin</span>
							<span class="truncate text-xs text-sidebar-foreground/70" title={email}>
								{email}
							</span>
						</div>
						<EllipsisVertical
							class="size-4 shrink-0 text-sidebar-foreground/60"
							aria-hidden="true"
						/>
					{/if}
				</button>

				{#if footerMenuOpen}
					<div
						role="menu"
						class="absolute bottom-0 left-full z-50 ml-2 w-56 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
					>
						<div class="px-2.5 py-2">
							<p class="text-xs leading-none font-semibold text-foreground">Administrator</p>
							<p class="mt-1 truncate text-xs leading-none text-muted-foreground" title={email}>
								{email}
							</p>
						</div>
						<div class="my-1 h-px bg-border"></div>
						<a
							href={siteUrl}
							target="_blank"
							rel="noreferrer"
							role="menuitem"
							class="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
						>
							<ExternalLink class="size-4" aria-hidden="true" />
							<span>Lihat Situs</span>
						</a>
						<div class="my-1 h-px bg-border"></div>
						<button
							type="button"
							role="menuitem"
							onclick={() => void handleLogout()}
							disabled={loggingOut}
							class="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
						>
							<LogOut class="size-4" aria-hidden="true" />
							<span>{loggingOut ? 'Keluar...' : 'Keluar'}</span>
						</button>
					</div>
				{/if}
			</div>
		</div>
	</aside>

	<!-- Mobile Navigation Drawer -->
	<dialog
		bind:this={mobileDrawer}
		aria-label="Navigasi Panel Admin"
		oncancel={() => (mobileOpen = false)}
		onclick={(e) => {
			if (e.target === mobileDrawer) closeMobileDrawer();
		}}
		class="m-0 h-svh max-h-svh w-72 max-w-[85vw] border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl backdrop:bg-black/55"
	>
		<div class="flex h-full flex-col">
			<div class="flex h-14 items-center justify-between border-b border-sidebar-border/60 px-4">
				<a href="/admin" class="flex items-center gap-2.5">
					<div
						class="flex size-8 items-center justify-center rounded-lg bg-brand font-heading text-sm font-extrabold text-ink"
					>
						DP
					</div>
					<span class="font-heading text-base font-extrabold">Desa Pendil</span>
				</a>
				<button
					type="button"
					onclick={closeMobileDrawer}
					aria-label="Tutup menu navigasi"
					class="rounded-md p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
				>
					<X class="size-4" aria-hidden="true" />
				</button>
			</div>

			<nav aria-label="Menu Mobile" class="flex-1 overflow-y-auto px-3 py-4">
				<ul class="space-y-1">
					{#each NAV_ITEMS as item (item.href)}
						{@const active = isNavActive(item.href)}
						{@const Icon = item.icon}
						<li>
							<a
								href={item.href}
								aria-current={active ? 'page' : undefined}
								class={cn(
									'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
									active
										? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
										: 'text-sidebar-foreground/80 hover:bg-sidebar-accent/70'
								)}
							>
								<Icon class="size-4 shrink-0" aria-hidden="true" />
								<span>{item.label}</span>
							</a>
						</li>
					{/each}
				</ul>
			</nav>

			<div class="border-t border-sidebar-border/60 p-3">
				<p class="truncate px-2 pb-2 text-xs text-muted-foreground" title={email}>{email}</p>
				<div class="flex flex-col gap-1">
					<a
						href={siteUrl}
						target="_blank"
						rel="noreferrer"
						class={buttonVariants({ variant: 'outline', size: 'sm', className: 'justify-start' })}
					>
						<ExternalLink class="size-4" aria-hidden="true" />
						<span>Lihat Situs</span>
					</a>
					<button
						type="button"
						onclick={() => void handleLogout()}
						disabled={loggingOut}
						class={buttonVariants({
							variant: 'ghost',
							size: 'sm',
							className:
								'justify-start text-destructive hover:bg-destructive/10 hover:text-destructive'
						})}
					>
						<LogOut class="size-4" aria-hidden="true" />
						<span>{loggingOut ? 'Keluar...' : 'Keluar'}</span>
					</button>
				</div>
			</div>
		</div>
	</dialog>

	<!-- Main Content Column -->
	<div class="flex min-w-0 flex-1 flex-col">
		<header
			class="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-md transition-colors sm:px-6"
		>
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={openMobileDrawer}
					aria-label="Buka menu navigasi"
					aria-expanded={mobileOpen}
					class={buttonVariants({ variant: 'ghost', size: 'icon', className: 'size-9 md:hidden' })}
				>
					<Menu class="size-4" aria-hidden="true" />
				</button>

				<span class="hidden md:inline-flex">
					<button
						type="button"
						onclick={() => (collapsed = !collapsed)}
						aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
						aria-pressed={collapsed}
						class={buttonVariants({
							variant: 'ghost',
							size: 'icon',
							className: 'size-9'
						})}
					>
						<PanelLeft class="size-4" aria-hidden="true" />
					</button>
				</span>

				<div class="hidden h-4 w-px bg-border sm:block"></div>

				<nav aria-label="Breadcrumb" class="hidden sm:block">
					<ol class="flex items-center gap-1.5 text-sm text-muted-foreground">
						{#each breadcrumbs as crumb, idx (crumb.label)}
							{#if idx > 0}
								<li aria-hidden="true">
									<ChevronRight class="size-3.5" />
								</li>
							{/if}
							<li>
								{#if crumb.isCurrent || !crumb.href}
									<span class="font-medium text-foreground">{crumb.label}</span>
								{:else}
									<a href={crumb.href} class="transition-colors hover:text-foreground">
										{crumb.label}
									</a>
								{/if}
							</li>
						{/each}
					</ol>
				</nav>
			</div>

			<div class="flex items-center gap-2">
				<a
					href={siteUrl}
					target="_blank"
					rel="noreferrer"
					title="Buka situs publik di tab baru"
					class={buttonVariants({
						variant: 'outline',
						size: 'sm',
						className: 'h-8 gap-1.5 text-xs font-medium'
					})}
				>
					<span class="hidden sm:inline">Lihat Situs</span>
					<span class="sm:hidden">Situs</span>
					<ExternalLink class="size-3.5" aria-hidden="true" />
				</a>

				<ThemeToggle />

				<div class="relative" bind:this={headerMenuRef}>
					<button
						type="button"
						onclick={() => (headerMenuOpen = !headerMenuOpen)}
						class={buttonVariants({
							variant: 'ghost',
							size: 'icon',
							className: 'size-9 rounded-full'
						})}
						aria-label="Menu akun admin"
						aria-expanded={headerMenuOpen}
						aria-haspopup="menu"
					>
						<span
							class="flex size-8 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand-strong"
						>
							{initials}
						</span>
					</button>

					{#if headerMenuOpen}
						<div
							role="menu"
							class="absolute right-0 z-50 mt-1.5 w-56 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
						>
							<div class="px-2.5 py-2">
								<p class="text-xs leading-none font-semibold text-foreground">Administrator</p>
								<p class="mt-1 truncate text-xs leading-none text-muted-foreground" title={email}>
									{email}
								</p>
							</div>
							<div class="my-1 h-px bg-border"></div>
							<a
								href={siteUrl}
								target="_blank"
								rel="noreferrer"
								role="menuitem"
								class="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
							>
								<ExternalLink class="size-4" aria-hidden="true" />
								<span>Lihat Situs</span>
							</a>
							<div class="my-1 h-px bg-border"></div>
							<button
								type="button"
								role="menuitem"
								onclick={() => void handleLogout()}
								disabled={loggingOut}
								class="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
							>
								<LogOut class="size-4" aria-hidden="true" />
								<span>{loggingOut ? 'Keluar...' : 'Keluar'}</span>
							</button>
						</div>
					{/if}
				</div>
			</div>
		</header>

		<main id="main-content" tabindex="-1" class="flex-1 p-4 sm:p-6 lg:p-8">
			<div class="mx-auto w-full max-w-6xl">
				{@render children()}
			</div>
		</main>
	</div>
</div>
