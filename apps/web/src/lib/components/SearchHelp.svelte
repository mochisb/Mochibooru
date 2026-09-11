<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { CircleHelp, X } from 'lucide-svelte';
</script>

<Dialog.Root>
	<Dialog.Trigger class="icon-button" aria-label="Search help"
		><CircleHelp size={18} /></Dialog.Trigger
	>
	<Dialog.Portal>
		<Dialog.Overlay class="dialog-overlay" />
		<Dialog.Content class="dialog-content">
			<div class="row between">
				<Dialog.Title class="section-title">Find exactly what you are looking for</Dialog.Title>
				<Dialog.Close class="icon-button" aria-label="Close help"><X size={20} /></Dialog.Close>
			</div>
			<Dialog.Description class="muted"
				>Combine tags and filters. Searches show safe-rated content by default.</Dialog.Description
			>
			<dl class="search-examples">
				<div>
					<dt><code>landscape sunset</code></dt>
					<dd>Both tags</dd>
				</div>
				<div>
					<dt><code>cat -dog</code></dt>
					<dd>Include cat and exclude dog</dd>
				</div>
				<div>
					<dt><code>rating:any</code></dt>
					<dd>All ratings</dd>
				</div>
				<div>
					<dt><code>type:animated</code></dt>
					<dd>Animated images</dd>
				</div>
				<div>
					<dt><code>width:>=1920</code></dt>
					<dd>At least 1920 px wide</dd>
				</div>
				<div>
					<dt><code>sort:score</code></dt>
					<dd>Most favorited first</dd>
				</div>
			</dl>
			<p class="muted small">
				Also supported: rating:safe, rating:questionable, rating:explicit, type:image, height:,
				sort:newest and sort:oldest. Use underscores for multiword tags.
			</p>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
