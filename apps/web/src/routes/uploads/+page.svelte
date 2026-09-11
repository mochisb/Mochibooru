<script lang="ts">
	import { UploadCloud } from 'lucide-svelte';
	import PostGrid from '$lib/components/PostGrid.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	let { data } = $props();
</script>

<svelte:head><title>My uploads · {data.siteName}</title></svelte:head>
<section class="page-heading">
	<div>
		<div class="eyebrow">YOUR CONTRIBUTION TO THE COMMUNITY</div>
		<h1>My uploads<span class="accent">.</span></h1>
		<p>Posts, reviews and work in progress, all in one place.</p>
	</div>
	<a class="button primary" href="/upload"><UploadCloud size={17} /> New upload</a>
</section>
{#if data.posts.length}<PostGrid posts={data.posts} /><Pagination
		page={data.page}
		hasNext={data.hasNext}
	/>{:else}<section class="empty-state">
		<UploadCloud size={36} class="accent" />
		<h2>Your collection starts here</h2>
		<p>Share your first image and track its processing status here.</p>
		<a class="button primary" href="/upload">Upload an image</a>
	</section>{/if}
