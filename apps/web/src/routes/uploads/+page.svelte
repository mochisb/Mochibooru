<script lang="ts">
	import { UploadCloud } from 'lucide-svelte';
	import PostGrid from '$lib/components/PostGrid.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Uploads · {data.siteName}</title></svelte:head>

<section class="page-heading">
	<div>
		<h1>My uploads</h1>
		<p>Your posts and their status.</p>
	</div>
	<a class="button primary" href="/upload"><UploadCloud size={16} /> New upload</a>
</section>

{#if data.posts.length}
	<PostGrid posts={data.posts} />
	<Pagination page={data.page} hasNext={data.hasNext} />
{:else}
	<section class="empty-state">
		<div class="empty-icon"><UploadCloud size={28} /></div>
		<h2>No uploads yet</h2>
		<p>Share your first image to see it here.</p>
		<a class="button primary" href="/upload">Upload image</a>
	</section>
{/if}
