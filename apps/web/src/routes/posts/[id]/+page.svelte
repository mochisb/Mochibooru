<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		Heart,
		ArrowLeft,
		ExternalLink,
		Maximize2,
		Clock,
		Check,
		X,
		RefreshCw,
		Pencil,
		History,
		ImageOff,
	} from 'lucide-svelte';
	let { data, form } = $props();
	let editing = $state(false);
	const processing = $derived(['queued', 'processing'].includes(data.post.status));
	const statusLabels: Record<string, string> = {
		queued: 'Queued',
		processing: 'Processing image',
		pending: 'Pending review',
		rejected: 'Removed from the gallery',
		failed: 'Processing failed',
		published: 'Published',
	};
	const actionLabels: Record<string, string> = {
		upload: 'Post created',
		edit: 'Metadata edited',
		publish: 'Post approved',
		reject: 'Post removed',
	};
	onMount(() => {
		let refreshing = false;
		const timer = setInterval(async () => {
			if (!processing || document.hidden || refreshing) return;
			refreshing = true;
			try {
				await invalidateAll();
			} finally {
				refreshing = false;
			}
		}, 3000);
		return () => clearInterval(timer);
	});
</script>

<svelte:head
	><title
		>{data.post.title ||
			data.post.tags
				.map((t) => t.name)
				.slice(0, 3)
				.join(', ')} · {data.siteName}</title
	></svelte:head
>
<div class="detail-top">
	<a class="text-link muted" href="/"><ArrowLeft size={16} /> Back to explore</a><span
		class="small muted">{statusLabels[data.post.status]}</span
	>
</div>
{#if form?.message}<p class="notice" role="status">{form.message}</p>{/if}
<div class="post-detail">
	<section class="viewer-column">
		<div class="image-viewer">
			{#if data.post.previewKey}<img
					src={`/media/${data.post.id}/${data.post.animated ? 'original' : 'preview'}`}
					alt={data.post.title ||
						data.post.tags.map((tag) => tag.name.replaceAll('_', ' ')).join(', ')}
					width={data.post.width ?? undefined}
					height={data.post.height ?? undefined}
				/>{:else}<div class="empty-state compact">
					{#if processing}<Clock size={40} class="accent" />
						<h2>{statusLabels[data.post.status]}</h2>
						<p>
							We are preparing the image and its thumbnails. This page refreshes automatically.
						</p>{:else}<ImageOff size={40} />
						<h2>No preview available</h2>
						<p>{data.post.processingError ?? statusLabels[data.post.status]}</p>{/if}
				</div>{/if}
		</div>
		{#if data.post.mime}<div class="viewer-footer">
				<span
					>{data.post.width} × {data.post.height}
					<span class="muted"
						>· {(data.post.bytes / 1024 / 1024).toFixed(2)} MB · {data.post.mime
							.replace('image/', '')
							.toUpperCase()}</span
					></span
				><a
					class="text-link"
					href={`/media/${data.post.id}/original`}
					target="_blank"
					rel="noreferrer"><Maximize2 size={15} /> View original</a
				>
			</div>{/if}
		<section class="panel revision-panel">
			<h3 class="row"><History size={16} /> History</h3>
			{#each data.revisions as revision}<details class="revision">
					<summary
						><span>{actionLabels[revision.action] ?? revision.action}</span><span
							class="muted small"
							>{revision.actor} · {new Date(revision.createdAt).toLocaleDateString('en-US')}</span
						></summary
					>
					<pre>{JSON.stringify({ before: revision.before, after: revision.after }, null, 2)}</pre>
				</details>{/each}
		</section>
	</section>
	<aside class="detail-sidebar">
		<div>
			<div class="eyebrow">POST</div>
			<h1>{data.post.title || 'Untitled'}</h1>
			<p class="muted small">
				Shared by <strong>{data.uploader}</strong><br />{new Date(
					data.post.createdAt,
				).toLocaleDateString('en-US', { dateStyle: 'long' })}
			</p>
		</div>
		<div class="detail-actions">
			{#if data.user}<form method="POST" action="?/favorite" use:enhance>
					<input type="hidden" name="saved" value={String(!data.saved)} /><button
						class="button secondary"
						class:saved={data.saved}
						aria-label={data.saved ? 'Remove from favorites' : 'Save to favorites'}
						><Heart size={18} fill={data.saved ? 'currentColor' : 'none'} />{data.saved
							? 'Saved'
							: 'Save'}<span>{data.score}</span></button
					>
				</form>{:else}<a class="button secondary" href={`/login?next=/posts/${data.post.id}`}
					><Heart size={18} /> Save <span>{data.score}</span></a
				>{/if}{#if data.canEdit}<button
					class="icon-button"
					aria-label="Edit post"
					onclick={() => (editing = !editing)}><Pencil size={18} /></button
				>{/if}
		</div>
		<div class="metadata-row">
			<span class="muted">Rating</span><span class="row"
				><span class={`rating-dot ${data.post.rating}`}></span>{data.post.rating}</span
			>
		</div>
		{#if data.post.source}<a
				class="source-link"
				href={data.post.source}
				target="_blank"
				rel="noopener noreferrer"><ExternalLink size={16} /> Visit original source</a
			>{/if}
		<div class="tag-section">
			<h3>Tags <span class="count-pill">{data.post.tags.length}</span></h3>
			<div class="detail-tags">
				{#each data.post.tags as tag}<a
						class={`tag-chip ${tag.category}`}
						href={`/?q=${encodeURIComponent(tag.name)}`}>{tag.name}</a
					>{/each}
			</div>
		</div>
		{#if editing && data.canEdit}<form
				class="form-stack panel"
				method="POST"
				action="?/edit"
				use:enhance
			>
				<h3>Edit post</h3>
				<label>Title<input name="title" value={data.post.title} maxlength="160" /></label><label
					>Tags<textarea
						name="tags"
						rows="5"
						required
						maxlength="4050"
						value={data.post.tags.map((tag) => tag.name).join(' ')}
					></textarea></label
				><label
					>Rating<select name="rating" value={data.post.rating}
						><option value="safe">Safe</option><option value="questionable">Questionable</option
						><option value="explicit">Explicit</option></select
					></label
				><label>Source<input name="source" type="url" value={data.post.source} /></label><button
					class="button primary">Save changes</button
				>
			</form>{/if}
		{#if data.post.status === 'failed' && data.user && (data.user.id === data.post.uploaderId || data.canModerate)}<form
				method="POST"
				action="?/retry"
				use:enhance
			>
				<button class="button secondary"><RefreshCw size={16} /> Retry processing</button>
			</form>{/if}
		{#if data.canModerate && ['pending', 'published', 'rejected'].includes(data.post.status)}<div
				class="panel moderation-panel"
			>
				<h3>Moderation</h3>
				<p class="muted small">Actions are recorded in the history.</p>
				<form method="POST" action="?/moderate" use:enhance class="form-stack">
					{#if data.post.status !== 'published'}<button
							name="action"
							value="publish"
							class="button primary"><Check size={16} /> Approve post</button
						>{/if}{#if data.post.status !== 'rejected'}<button
							name="action"
							value="reject"
							class="button danger"><X size={16} /> Remove post</button
						>{/if}
				</form>
			</div>{/if}
	</aside>
</div>
