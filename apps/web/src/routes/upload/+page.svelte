<script lang="ts">
	import { onDestroy } from 'svelte';
	import { UploadCloud, X, Check, ArrowUpRight, LoaderCircle } from 'lucide-svelte';
	let { data } = $props();
	type UploadItem = {
		file: File;
		preview: string;
		progress: number;
		state: 'waiting' | 'uploading' | 'done' | 'error';
		message?: string;
		url?: string;
	};
	let items = $state<UploadItem[]>([]);
	let title = $state('');
	let tags = $state('');
	let source = $state('');
	let rating = $state('safe');
	let busy = $state(false);
	let dragging = $state(false);
	let notice = $state('');
	let picker: HTMLInputElement;
	let activeRequest: XMLHttpRequest | undefined;
	let destroyed = false;
	function add(files: FileList | null) {
		if (!files || busy) return;
		notice = '';
		for (const file of files) {
			if (items.length >= 20) {
				notice = 'You can upload up to 20 images per batch.';
				break;
			}
			if (
				!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(file.type)
			) {
				notice = `${file.name}: unsupported format.`;
				continue;
			}
			if (file.size > data.maxUploadMb * 1024 * 1024) {
				notice = `${file.name}: exceeds ${data.maxUploadMb} MB.`;
				continue;
			}
			items.push({ file, preview: URL.createObjectURL(file), progress: 0, state: 'waiting' });
		}
		if (picker) picker.value = '';
	}
	function remove(index: number) {
		URL.revokeObjectURL(items[index].preview);
		items.splice(index, 1);
	}
	function upload(item: UploadItem) {
		return new Promise<void>((resolve) => {
			item.state = 'uploading';
			item.message = undefined;
			const form = new FormData();
			form.set('file', item.file);
			form.set('title', title);
			form.set('tags', tags);
			form.set('rating', rating);
			form.set('source', source);
			const xhr = new XMLHttpRequest();
			activeRequest = xhr;
			xhr.open('POST', '/api/v1/posts');
			xhr.timeout = 120_000;
			xhr.upload.onprogress = (event) => {
				if (event.lengthComputable) item.progress = Math.round((event.loaded / event.total) * 100);
			};
			xhr.onload = () => {
				let result: { url?: string; message?: string } = {};
				try {
					result = JSON.parse(xhr.responseText);
				} catch {
					/* A proxy may return a non-JSON error. */
				}
				if (xhr.status === 201) {
					item.state = 'done';
					item.url = result.url;
				} else {
					item.state = 'error';
					item.message = result.message ?? `Upload failed (${xhr.status}).`;
				}
				resolve();
			};
			const fail = () => {
				item.state = 'error';
				item.message = 'The connection was interrupted. You can try again.';
				resolve();
			};
			xhr.onerror = fail;
			xhr.ontimeout = fail;
			xhr.onabort = fail;
			xhr.send(form);
		});
	}
	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!items.length) {
			notice = 'Select at least one image.';
			return;
		}
		busy = true;
		for (const item of items) {
			if (destroyed) break;
			if (item.state !== 'done') await upload(item);
		}
		busy = false;
	}
	onDestroy(() => {
		destroyed = true;
		activeRequest?.abort();
		for (const item of items) URL.revokeObjectURL(item.preview);
	});
</script>

<svelte:head><title>Upload · {data.siteName}</title></svelte:head>

<section class="page-heading">
	<div>
		<h1>Upload images</h1>
		<p>Add images and tags to the gallery.</p>
	</div>
</section>

<form onsubmit={submit} class="upload-layout">
	<section>
		<input
			class="sr-only"
			bind:this={picker}
			type="file"
			accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
			multiple
			onchange={(event) => add(event.currentTarget.files)}
			aria-label="Select images"
			disabled={busy}
		/>
		<button
			type="button"
			class="dropzone"
			class:dragging
			disabled={busy}
			onclick={() => picker.click()}
			ondragover={(event) => {
				event.preventDefault();
				dragging = true;
			}}
			ondragleave={() => (dragging = false)}
			ondrop={(event) => {
				event.preventDefault();
				dragging = false;
				add(event.dataTransfer?.files ?? null);
			}}
		>
			<span class="empty-icon"><UploadCloud size={28} /></span>
			<strong>Drop images here</strong>
			<span>or click to browse</span>
			<small>JPEG, PNG, WebP, GIF and AVIF · Up to {data.maxUploadMb} MB</small>
		</button>
		{#if notice}<p class="notice error" role="alert">{notice}</p>{/if}
		<div class="upload-list" aria-live="polite">
			{#each items as item, index}
				<div class="upload-item">
					<img src={item.preview} alt={item.file.name} />
					<div class="upload-info">
						<strong>{item.file.name}</strong>
						<span class="muted small"
							>{(item.file.size / 1024 / 1024).toFixed(2)} MB · {item.state === 'done'
								? 'Queued for processing'
								: item.state === 'uploading'
									? `Uploading ${item.progress}%`
									: item.state === 'error'
										? item.message
										: 'Ready'}</span
						>
						{#if item.state === 'uploading'}
							<progress
								max="100"
								value={item.progress}
								aria-label={`Upload progress for ${item.file.name}`}
							></progress>
						{/if}
					</div>
					{#if item.state === 'done'}
						<a class="icon-button" href={item.url} aria-label={`View ${item.file.name}`}
							><ArrowUpRight size={18} /></a
						>
						<Check size={18} class="success-text" />
					{:else}
						<button
							type="button"
							class="icon-button"
							disabled={busy}
							onclick={() => remove(index)}
							aria-label={`Remove ${item.file.name}`}><X size={18} /></button
						>
					{/if}
				</div>
			{/each}
		</div>
	</section>
	<aside class="panel upload-fields form-stack">
		<div>
			<h2>Details</h2>
			<p class="muted small">Applied to every image in this batch.</p>
		</div>
		<label
			>Title <span class="muted small">optional</span><input
				bind:value={title}
				maxlength="160"
				placeholder="Title"
				disabled={busy}
			/></label
		>
		<label
			>Tags<textarea
				name="tags"
				bind:value={tags}
				required
				maxlength="4050"
				rows="4"
				placeholder="landscape sunset pixel_art"
				disabled={busy}
			></textarea></label
		>
		<p class="field-hint">1 to 50 tags separated by spaces. Use underscores for multi-word tags.</p>
		<label
			>Rating<select bind:value={rating} disabled={busy}
				><option value="safe">Safe</option><option value="questionable">Questionable</option><option
					value="explicit">Explicit</option
				></select
			></label
		>
		<label
			>Source <span class="muted small">optional</span><input
				bind:value={source}
				type="url"
				placeholder="https://artist.example/artwork"
				disabled={busy}
			/></label
		>
		{#if data.requireApproval}<p class="notice">Posts in this community require review.</p>{/if}
		<button
			class="button primary"
			disabled={busy || !items.length || items.every((item) => item.state === 'done')}
			>{#if busy}<LoaderCircle size={17} class="spin" /> Uploading…{:else}<UploadCloud size={17} /> Upload
				{items.filter((item) => item.state !== 'done').length || ''}
				{items.filter((item) => item.state !== 'done').length === 1
					? 'image'
					: 'images'}{/if}</button
		>
		<a class="text-link centered" href="/uploads">View uploads <ArrowUpRight size={14} /></a>
	</aside>
</form>
