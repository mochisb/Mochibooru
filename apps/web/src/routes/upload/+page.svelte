<script lang="ts">
	import { onDestroy } from 'svelte';
	import { UploadCloud, X, Check, ArrowUpRight, LoaderCircle, Info } from 'lucide-svelte';
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
				notice = 'Puedes subir hasta 20 imágenes por lote.';
				break;
			}
			if (
				!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(file.type)
			) {
				notice = `${file.name}: formato no admitido.`;
				continue;
			}
			if (file.size > data.maxUploadMb * 1024 * 1024) {
				notice = `${file.name}: supera ${data.maxUploadMb} MB.`;
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
					item.message = result.message ?? `No se pudo subir (${xhr.status}).`;
				}
				resolve();
			};
			const fail = () => {
				item.state = 'error';
				item.message = 'La conexión se interrumpió. Puedes reintentar.';
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
			notice = 'Selecciona al menos una imagen.';
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

<svelte:head><title>Subir imágenes · {data.siteName}</title></svelte:head>
<section class="page-heading">
	<div>
		<div class="eyebrow">DALE VIDA A LA COLECCIÓN</div>
		<h1>Algo que merece compartirse<span class="accent">.</span></h1>
		<p>Una imagen, unas etiquetas y muchas formas de descubrirla.</p>
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
			aria-label="Seleccionar imágenes"
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
			><span class="empty-icon"><UploadCloud size={30} /></span><strong
				>Arrastra tus imágenes aquí</strong
			><span>o pulsa para elegir archivos</span><small
				>JPEG, PNG, WebP, GIF y AVIF · Hasta {data.maxUploadMb} MB por imagen</small
			></button
		>
		{#if notice}<p class="notice error" role="alert">{notice}</p>{/if}
		<div class="upload-list" aria-live="polite">
			{#each items as item, index}<div class="upload-item">
					<img src={item.preview} alt={item.file.name} />
					<div class="upload-info">
						<strong>{item.file.name}</strong><span class="muted small"
							>{(item.file.size / 1024 / 1024).toFixed(2)} MB · {item.state === 'done'
								? 'En cola de procesamiento'
								: item.state === 'uploading'
									? `Subiendo ${item.progress}%`
									: item.state === 'error'
										? item.message
										: 'Lista para subir'}</span
						>{#if item.state === 'uploading'}<progress
								max="100"
								value={item.progress}
								aria-label={`Progreso de ${item.file.name}`}
							></progress>{/if}
					</div>
					{#if item.state === 'done'}<a
							class="icon-button"
							href={item.url}
							aria-label={`Ver ${item.file.name}`}><ArrowUpRight size={20} /></a
						><Check size={18} class="success-text" />{:else}<button
							type="button"
							class="icon-button"
							disabled={busy}
							onclick={() => remove(index)}
							aria-label={`Quitar ${item.file.name}`}><X size={18} /></button
						>{/if}
				</div>{/each}
		</div>
		<p class="muted small row">
			<Info size={15} /> Las imágenes se validan y procesan antes de aparecer en la galería.
		</p>
	</section>
	<aside class="panel upload-fields form-stack">
		<div>
			<h2>Los detalles importan</h2>
			<p class="muted small">
				Estos datos se aplican a todo el lote. Después podrás editar cada publicación.
			</p>
		</div>
		<label
			>Título <span class="muted small">opcional</span><input
				bind:value={title}
				maxlength="160"
				placeholder="Dale un nombre a la inspiración"
				disabled={busy}
			/></label
		><label
			>Etiquetas<textarea
				name="tags"
				bind:value={tags}
				required
				maxlength="4050"
				rows="4"
				placeholder="landscape sunset pixel_art"
				disabled={busy}
			></textarea></label
		>
		<p class="field-hint">
			Entre 1 y 50 etiquetas, separadas por espacios. Usa guiones bajos para unir palabras.
		</p>
		<label
			>Clasificación<select bind:value={rating} disabled={busy}
				><option value="safe">Safe — general</option><option value="questionable"
					>Questionable — sugerente</option
				><option value="explicit">Explicit — explícito</option></select
			></label
		><label
			>Fuente <span class="muted small">opcional</span><input
				bind:value={source}
				type="url"
				placeholder="https://sitio-del-autor.com/obra"
				disabled={busy}
			/></label
		>{#if data.requireApproval}<p class="notice">
				Las publicaciones de esta comunidad pasan por revisión.
			</p>{/if}<button
			class="button primary"
			disabled={busy || !items.length || items.every((item) => item.state === 'done')}
			>{#if busy}<LoaderCircle size={17} class="spin" /> Subiendo…{:else}<UploadCloud size={17} /> Publicar
				{items.filter((item) => item.state !== 'done').length || ''} imágenes{/if}</button
		><a class="text-link centered" href="/uploads"
			>Ver todas mis subidas <ArrowUpRight size={14} /></a
		>
	</aside>
</form>
