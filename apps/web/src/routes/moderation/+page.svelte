<script lang="ts">
	import { ShieldCheck } from 'lucide-svelte';
	import PostGrid from '$lib/components/PostGrid.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Moderation · {data.siteName}</title></svelte:head>
<section class="page-heading">
	<div>
		<div class="eyebrow">LET'S CARE FOR THIS SPACE</div>
		<h1>Review queue<span class="accent">.</span></h1>
		<p>Oldest posts appear first. Open an image to review it.</p>
	</div>
</section>
{#if data.posts.length}<PostGrid posts={data.posts} /><Pagination
		page={data.page}
		hasNext={data.hasNext}
	/>{:else}<section class="empty-state">
		<ShieldCheck size={40} class="accent" />
		<h2>All caught up</h2>
		<p>There are no posts awaiting review.</p>
	</section>{/if}
