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
		<div class="eyebrow"><Sparkles size={14} /> DESCUBRE. GUARDA. CONECTA.</div>
		<h1>
			{data.favoritesOnly ? 'Tus favoritos' : 'Encuentra tu próxima inspiración'}<span
				class="accent">.</span
			>
		</h1>
		<p>
			{data.favoritesOnly
				? 'Ese pequeño universo al que siempre quieres volver.'
				: 'Un universo de imágenes, conectado por etiquetas. Hazlo tuyo.'}
		</p>
	</div>
	<div class="heading-art" aria-hidden="true">✳</div>
</section>
<SearchBar value={data.q} />
{#if data.popular.length}<div class="popular-tags">
		<span class="muted small">Explora etiquetas</span>{#each data.popular.slice(0, 7) as tag}<a
				class="tag-chip"
				href={`/?q=${encodeURIComponent(tag.name)}`}><Hash size={12} />{tag.name}</a
			>{/each}
	</div>{/if}
<div class="gallery-toolbar">
	<div class="row">
		<span class="section-marker"></span>
		<h2>{data.q ? 'Resultados' : data.favoritesOnly ? 'Tu colección' : 'Recién llegadas'}</h2>
		<span class="count-pill">{data.posts.length}{data.hasNext ? '+' : ''}</span>
	</div>
	<div class="row filters">
		<SlidersHorizontal size={15} class="muted" /><label class="sr-only" for="rating-filter"
			>Clasificación</label
		><select
			id="rating-filter"
			value={selectedRating}
			onchange={(event) => filter('rating', event.currentTarget.value)}
			><option value="safe">Safe</option><option value="questionable">Questionable</option><option
				value="explicit">Explicit</option
			><option value="any">Todas</option></select
		><label class="sr-only" for="sort-filter">Ordenar</label><select
			id="sort-filter"
			value={selectedSort}
			onchange={(event) => filter('sort', event.currentTarget.value)}
			><option value="newest">Más recientes</option><option value="oldest">Más antiguas</option
			><option value="score">Más favoritos</option></select
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
			>{data.q || data.favoritesOnly ? 'UN POCO MÁS ALLÁ' : 'TODO EMPIEZA CON UNA IMAGEN'}</span
		>
		<h2>
			{data.q
				? 'Aún no hay coincidencias'
				: data.favoritesOnly
					? 'Aquí vivirán tus favoritos'
					: 'Tu universo está por comenzar'}
		</h2>
		<p>
			{data.q
				? 'Prueba con menos etiquetas o cambia los filtros para ampliar tu búsqueda.'
				: data.favoritesOnly
					? 'Abre una publicación y pulsa el corazón para guardarla aquí.'
					: 'Comparte la primera imagen, añade unas etiquetas y dale vida a esta comunidad.'}
		</p>
		<a class="button primary" href={data.q || data.favoritesOnly ? '/' : '/upload'}
			>{data.q || data.favoritesOnly ? 'Explorar imágenes' : 'Subir la primera imagen'}<ArrowRight
				size={16}
			/></a
		>
		<div class="empty-steps">
			<span><b>01</b> Sube</span><span><b>02</b> Etiqueta</span><span><b>03</b> Descubre</span>
		</div>
	</section>
{/if}
<div class="gallery-note">
	<span class="rating-dot safe"></span><span
		>Las búsquedas muestran contenido safe por defecto.</span
	><span class="muted">Pulsa <kbd>/</kbd> para buscar</span>
</div>
