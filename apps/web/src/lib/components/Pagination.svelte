<script lang="ts">
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { page as current } from '$app/state';
	let { page, hasNext }: { page: number; hasNext: boolean } = $props();
	function href(number: number) {
		const params = new URLSearchParams(current.url.searchParams);
		params.set('page', String(number));
		return `${current.url.pathname}?${params}`;
	}
</script>

{#if page > 1 || hasNext}
	<nav class="pagination" aria-label="Pagination">
		{#if page > 1}<a class="button secondary" href={href(page - 1)}
				><ChevronLeft size={16} /> Previous</a
			>{/if}
		<span class="muted">Page {page}</span>
		{#if hasNext && page < 250}<a class="button secondary" href={href(page + 1)}
				>Next <ChevronRight size={16} /></a
			>{/if}
	</nav>
{/if}
