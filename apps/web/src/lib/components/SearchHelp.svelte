<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { CircleHelp, X } from 'lucide-svelte';
</script>

<Dialog.Root>
	<Dialog.Trigger class="icon-button" aria-label="Ayuda de búsqueda"
		><CircleHelp size={18} /></Dialog.Trigger
	>
	<Dialog.Portal>
		<Dialog.Overlay class="dialog-overlay" />
		<Dialog.Content class="dialog-content">
			<div class="row between">
				<Dialog.Title class="section-title">Encuentra justo lo que buscas</Dialog.Title>
				<Dialog.Close class="icon-button" aria-label="Cerrar ayuda"><X size={20} /></Dialog.Close>
			</div>
			<Dialog.Description class="muted"
				>Combina etiquetas y filtros. La búsqueda muestra contenido safe por defecto.</Dialog.Description
			>
			<dl class="search-examples">
				<div>
					<dt><code>landscape sunset</code></dt>
					<dd>Ambas etiquetas</dd>
				</div>
				<div>
					<dt><code>cat -dog</code></dt>
					<dd>Incluye cat y excluye dog</dd>
				</div>
				<div>
					<dt><code>rating:any</code></dt>
					<dd>Todas las clasificaciones</dd>
				</div>
				<div>
					<dt><code>type:animated</code></dt>
					<dd>Imágenes animadas</dd>
				</div>
				<div>
					<dt><code>width:>=1920</code></dt>
					<dd>Ancho mínimo de 1920 px</dd>
				</div>
				<div>
					<dt><code>sort:score</code></dt>
					<dd>Más favoritos primero</dd>
				</div>
			</dl>
			<p class="muted small">
				También: rating:safe, rating:questionable, rating:explicit, type:image, height:, sort:newest
				y sort:oldest. Usa guiones bajos para etiquetas con varias palabras.
			</p>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
