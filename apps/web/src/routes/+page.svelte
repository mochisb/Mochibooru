<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Sparkles, SlidersHorizontal, ImagePlus, SearchX, ArrowRight, Hash } from 'lucide-svelte';
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

<section class="page-heading">
	<div>
		<div class="eyebrow"><Sparkles size={14} /> DISCOVER. SAVE. CONNECT.</div>
		<h1>
			{data.favoritesOnly ? 'Your favorites' : 'Find your next inspiration'}<span class="accent"
				>.</span
			>
		</h1>
		<p>
			{data.favoritesOnly
				? 'That little universe you always want to return to.'
				: 'A universe of images, connected by tags. Make it yours.'}
		</p>
	</div>
	<div class="heading-art" aria-hidden="true">✳</div>
</section>
<SearchBar value={data.q} />
{#if data.popular.length}<div class="popular-tags">
		<span class="muted small">Explore tags</span>{#each data.popular.slice(0, 7) as tag}<a
				class="tag-chip"
				href={`/?q=${encodeURIComponent(tag.name)}`}><Hash size={12} />{tag.name}</a
			>{/each}
	</div>{/if}
<div class="gallery-toolbar">
	<div class="row">
		<span class="section-marker"></span>
		<h2>{data.q ? 'Results' : data.favoritesOnly ? 'Your collection' : 'Fresh arrivals'}</h2>
		<span class="count-pill">{data.posts.length}{data.hasNext ? '+' : ''}</span>
	</div>
	<div class="row filters">
		<SlidersHorizontal size={15} class="muted" /><label class="sr-only" for="rating-filter"
			>Rating</label
		><select
			id="rating-filter"
			value={selectedRating}
			onchange={(event) => filter('rating', event.currentTarget.value)}
			><option value="safe">Safe</option><option value="questionable">Questionable</option><option
				value="explicit">Explicit</option
			><option value="any">All ratings</option></select
		><label class="sr-only" for="sort-filter">Sort by</label><select
			id="sort-filter"
			value={selectedSort}
			onchange={(event) => filter('sort', event.currentTarget.value)}
			><option value="newest">Newest first</option><option value="oldest">Oldest first</option
			><option value="score">Most favorited</option></select
		>
	</div>
</div>
{#if data.searchError}<div class="notice error" role="alert">{data.searchError}</div>{/if}
{#if data.posts.length}
	<PostGrid posts={data.posts} /><Pagination page={data.page} hasNext={data.hasNext} />
{:else}
	<section class="empty-state">
		<div class="empty-icon">
			{#if data.q || data.favoritesOnly}<SearchX size={34} />{:else}<ImagePlus size={34} />{/if}
		</div>
		<span class="eyebrow"
			>{data.q || data.favoritesOnly ? 'KEEP EXPLORING' : 'IT ALL STARTS WITH AN IMAGE'}</span
		>
		<h2>
			{data.q
				? 'No matches yet'
				: data.favoritesOnly
					? 'Your favorites will live here'
					: 'Your universe is about to begin'}
		</h2>
		<p>
			{data.q
				? 'Try fewer tags or adjust the filters to broaden your search.'
				: data.favoritesOnly
					? 'Open a post and tap the heart to save it here.'
					: 'Share the first image, add a few tags and bring this community to life.'}
		</p>
		<a class="button primary" href={data.q || data.favoritesOnly ? '/' : '/upload'}
			>{data.q || data.favoritesOnly ? 'Explore images' : 'Upload the first image'}<ArrowRight
				size={16}
			/></a
		>
		<div class="empty-steps">
			<span><b>01</b> Upload</span><span><b>02</b> Tag</span><span><b>03</b> Discover</span>
		</div>
	</section>
{/if}
<div class="gallery-note">
	<span class="rating-dot safe"></span><span>Searches show safe-rated content by default.</span
	><span class="muted">Press <kbd>/</kbd> to search</span>
</div>
