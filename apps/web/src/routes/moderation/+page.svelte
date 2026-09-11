<script lang="ts">
	import { ShieldCheck } from 'lucide-svelte';
	import PostGrid from '$lib/components/PostGrid.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Moderation · {data.siteName}</title></svelte:head>

<section class="page-heading">
	<div>
		<h1>Moderation queue</h1>
		<p>Review pending posts. Oldest first.</p>
	</div>
</section>

{#if data.posts.length}
	<PostGrid posts={data.posts} />
	<Pagination page={data.page} hasNext={data.hasNext} />
{:else}
	<section class="empty-state">
		<div class="empty-icon"><ShieldCheck size={28} /></div>
		<h2>All caught up</h2>
		<p>No posts awaiting review.</p>
	</section>
{/if}
