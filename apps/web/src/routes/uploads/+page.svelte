<script lang="ts">
	import { UploadCloud } from 'lucide-svelte';
	import PostGrid from '$lib/components/PostGrid.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Mis subidas · {data.siteName}</title></svelte:head>
<section class="page-heading">
	<div>
		<div class="eyebrow">TU APORTE A LA COMUNIDAD</div>
		<h1>Mis subidas<span class="accent">.</span></h1>
		<p>Publicaciones, revisiones y trabajos en proceso, en un solo lugar.</p>
	</div>
	<a class="button primary" href="/upload"><UploadCloud size={17} /> Nueva subida</a>
</section>
{#if data.posts.length}<PostGrid posts={data.posts} /><Pagination
		page={data.page}
		hasNext={data.hasNext}
	/>{:else}<section class="empty-state">
		<UploadCloud size={36} class="accent" />
		<h2>Aquí comienza tu colección</h2>
		<p>Comparte tu primera imagen y sigue su estado de procesamiento desde aquí.</p>
		<a class="button primary" href="/upload">Subir una imagen</a>
	</section>{/if}
