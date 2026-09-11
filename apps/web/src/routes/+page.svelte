<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SlidersHorizontal, Search, ImagePlus, Hash } from 'lucide-svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import PostGrid from '$lib/components/PostGrid.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	let { data } = $props();
	function filter(key: string, value: string) {
		const tokens = data.q.split(/\s+/).filter((t: string) => t && !t.startsWith(`${key}:`));
		if (value) tokens.push(`${key}:${value}`);
		const params = new URLSearchParams(page.url.searchParams);
		params.set('q', tokens.join(' '));
		params.delete('page');
		goto(`/?${params}`);
	}
	const selectedRating = $derived(data.q.match(/(?:^|\s)rating:(\w+)/)?.[1] ?? 'safe');
	const selectedSort = $derived(data.q.match(/(?:^|\s)sort:(\w+)/)?.[1] ?? 'newest');
</script>

<section class="hero">
	<h1 class="hero-title">
		{data.favoritesOnly ? 'Your favorites' : `Find images on ${data.siteName}`}
	</h1>
	<p class="hero-subtitle">
		{data.favoritesOnly ? 'Posts you have saved.' : 'Search by tags, artists, characters and more.'}
	</p>
	<div class="hero-search">
		<SearchBar value={data.q} />
	</div>
	{#if data.popular.length}
		<div class="popular-tags">
			<span class="muted small">Popular</span>
			{#each data.popular.slice(0, 8) as tag}
				<a class="tag-chip" href={`/?q=${encodeURIComponent(tag.name)}`}
					><Hash size={11} />{tag.name}</a
				>
			{/each}
		</div>
	{/if}
</section>

{#if data.searchError}
	<div class="notice error" role="alert">{data.searchError}</div>
{/if}

<div class="gallery-toolbar">
	<div class="row">
		<h2>{data.q ? 'Results' : data.favoritesOnly ? 'Favorites' : 'Recent'}</h2>
		<span class="count-pill">{data.posts.length}{data.hasNext ? '+' : ''}</span>
	</div>
	<div class="filters">
		<SlidersHorizontal size={14} class="muted" />
		<label class="sr-only" for="rating-filter">Rating</label>
		<select
			id="rating-filter"
			value={selectedRating}
			onchange={(event) => filter('rating', event.currentTarget.value)}
		>
			<option value="safe">Safe</option>
			<option value="questionable">Questionable</option>
			<option value="explicit">Explicit</option>
			<option value="any">All</option>
		</select>
		<label class="sr-only" for="sort-filter">Sort by</label>
		<select
			id="sort-filter"
			value={selectedSort}
			onchange={(event) => filter('sort', event.currentTarget.value)}
		>
			<option value="newest">Newest</option>
			<option value="oldest">Oldest</option>
			<option value="score">Top</option>
		</select>
	</div>
</div>

{#if data.posts.length}
	<PostGrid posts={data.posts} />
	<Pagination page={data.page} hasNext={data.hasNext} />
{:else}
	<section class="empty-state">
		<div class="empty-icon">
			{#if data.q || data.favoritesOnly}<Search size={32} class="accent" />{:else}<ImagePlus
					size={32}
					class="accent"
				/>{/if}
		</div>
		<h2>
			{data.q ? 'No matches' : data.favoritesOnly ? 'No favorites yet' : 'No images yet'}
		</h2>
		<p>
			{data.q
				? 'Try fewer tags or change the filters.'
				: data.favoritesOnly
					? 'Save posts to see them here.'
					: 'Upload the first image to get started.'}
		</p>
		<a class="button primary" href={data.q || data.favoritesOnly ? '/' : '/upload'}>
			{data.q || data.favoritesOnly ? 'Explore' : 'Upload image'}
		</a>
	</section>
{/if}
