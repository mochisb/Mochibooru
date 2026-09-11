<script lang="ts">
	import { Image, Clock, ArrowUpRight, Film } from 'lucide-svelte';
	type Card = {
		id: string;
		title: string;
		thumbnailKey: string | null;
		width: number | null;
		height: number | null;
		rating: string;
		status: string;
		animated: boolean;
		tags: { name: string; category: string }[];
	};
	let { posts }: { posts: Card[] } = $props();
	const statuses: Record<string, string> = {
		queued: 'Queued',
		processing: 'Processing',
		pending: 'Under review',
		rejected: 'Removed',
		failed: 'Failed',
	};
</script>

<div class="post-grid">
	{#each posts as post (post.id)}
		<a class="post-card" href={`/posts/${post.id}`}>
			<div class="post-image">
				{#if post.thumbnailKey}
					<img
						src={`/media/${post.id}/thumbnail`}
						alt={post.title || post.tags.map((tag) => tag.name.replaceAll('_', ' ')).join(', ')}
						loading="lazy"
						width={post.width ?? 480}
						height={post.height ?? 480}
					/>
				{:else}
					<div class="image-placeholder">
						{#if post.status === 'failed'}<Image size={30} />{:else}<Clock size={30} />{/if}<span
							>{statuses[post.status] ?? 'No preview available'}</span
						>
					</div>
				{/if}
				<span class={`rating-dot ${post.rating}`} title={post.rating}></span>
				{#if post.animated}<span class="media-badge"><Film size={12} /> GIF</span>{/if}
				{#if post.status !== 'published' && post.thumbnailKey}<span class="status-badge"
						>{statuses[post.status]}</span
					>{/if}
				<span class="card-open"><ArrowUpRight size={18} /></span>
			</div>
			<div class="post-caption">
				<span>{post.title || post.tags[0]?.name.replaceAll('_', ' ') || 'Untitled'}</span><small
					>{post.width ? `${post.width} × ${post.height}` : '···'}</small
				>
			</div>
			<div class="card-tags">
				{post.tags
					.slice(0, 3)
					.map((tag) => tag.name)
					.join(' · ')}
			</div>
		</a>
	{/each}
</div>
