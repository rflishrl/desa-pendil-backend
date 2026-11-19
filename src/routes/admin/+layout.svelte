<script lang="ts">
	import type { Snippet } from 'svelte';

	import AdminShell from '#lib/components/admin-kit/AdminShell.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<AdminShell email={data.admin.email} frontendUrl={data.frontendUrl}>
	{@render children()}
</AdminShell>
