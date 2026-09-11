<script lang="ts">
	import { ShieldCheck } from 'lucide-svelte';
	import PostGrid from '$lib/components/PostGrid.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Moderación · {data.siteName}</title></svelte:head>
<section class="page-heading">
	<div>
		<div class="eyebrow">CUIDEMOS ESTE ESPACIO</div>
		<h1>Cola de revisión<span class="accent">.</span></h1>
		<p>Las publicaciones más antiguas aparecen primero. Abre una imagen para revisarla.</p>
	</div>
</section>
{#if data.posts.length}<PostGrid posts={data.posts} /><Pagination
		page={data.page}
		hasNext={data.hasNext}
	/>{:else}<section class="empty-state">
		<ShieldCheck size={40} class="accent" />
		<h2>Todo al día</h2>
		<p>No hay publicaciones pendientes de revisión.</p>
	</section>{/if}
