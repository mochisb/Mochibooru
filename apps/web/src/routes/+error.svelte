<script lang="ts">
	import { page } from '$app/state';
	import { ArrowLeft } from 'lucide-svelte';
</script>

<section class="empty-state">
	<span class="eyebrow">ERROR {page.status}</span>
	<h1>
		{page.status === 404
			? 'Por aquí todavía no hay nada'
			: page.status === 401
				? 'Este espacio necesita una cuenta'
				: 'Algo no ha salido como esperábamos'}
	</h1>
	<p>{page.error?.message}</p>
	<a class="button primary" href={page.status === 401 ? '/login' : '/'}
		><ArrowLeft size={16} />{page.status === 401 ? 'Iniciar sesión' : 'Volver a explorar'}</a
	>
</section>
