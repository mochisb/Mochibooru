<script lang="ts">
	import { page } from '$app/state';
	import { ArrowLeft } from 'lucide-svelte';
</script>

<section class="empty-state">
	<span class="eyebrow">ERROR {page.status}</span>
	<h1>
		{page.status === 404
			? 'Nothing here yet'
			: page.status === 401
				? 'You need an account to access this space'
				: 'Something went wrong'}
	</h1>
	<p>{page.error?.message}</p>
	<a class="button primary" href={page.status === 401 ? '/login' : '/'}
		><ArrowLeft size={16} />{page.status === 401 ? 'Sign in' : 'Back to explore'}</a
	>
</section>
