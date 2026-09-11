<script lang="ts">
	import { untrack } from 'svelte';
	import { Search, ArrowUpRight } from 'lucide-svelte';
	import SearchHelp from './SearchHelp.svelte';
	let { value = '' }: { value?: string } = $props();
	let text = $state(untrack(() => value));
	let input: HTMLInputElement;
	let suggestions = $state<{ name: string; count: number; category: string }[]>([]);
	let focused = $state(false);
	let active = $state(-1);
	$effect(() => {
		text = value;
	});
	$effect(() => {
		const token = text.split(/\s+/).at(-1)?.replace(/^-/, '') ?? '';
		if (!focused || !token || token.includes(':')) {
			suggestions = [];
			return;
		}
		const controller = new AbortController();
		const timeout = setTimeout(async () => {
			try {
				const response = await fetch(`/api/v1/tags?q=${encodeURIComponent(token)}`, {
					signal: controller.signal,
				});
				if (response.ok) {
					suggestions = (await response.json()).tags;
					active = -1;
				}
			} catch {
				/* A new keystroke cancels the previous request. */
			}
		}, 180);
		return () => {
			clearTimeout(timeout);
			controller.abort();
		};
	});
	function select(name: string) {
		const tokens = text.split(/\s+/);
		const prefix = tokens.at(-1)?.startsWith('-') ? '-' : '';
		tokens[tokens.length - 1] = `${prefix}${name}`;
		text = tokens.join(' ') + ' ';
		suggestions = [];
		active = -1;
		input.focus();
	}
	function keydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			suggestions = [];
			active = -1;
		}
		if (!suggestions.length) return;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			active = (active + 1) % suggestions.length;
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			active = (active - 1 + suggestions.length) % suggestions.length;
		}
		if (event.key === 'Enter' && active >= 0) {
			event.preventDefault();
			select(suggestions[active].name);
		}
	}
</script>

<svelte:window
	onkeydown={(event) => {
		if (
			event.key === '/' &&
			!event.ctrlKey &&
			!event.metaKey &&
			!(
				event.target instanceof HTMLElement &&
				(['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) ||
					event.target.isContentEditable)
			)
		) {
			event.preventDefault();
			input.focus();
		}
	}}
/>

<div class="search-wrap">
	<form action="/" method="GET" class="search-form" role="search">
		<Search size={20} class="muted" />
		<input
			bind:this={input}
			bind:value={text}
			name="q"
			aria-label="Search posts"
			placeholder="Search tags, artists, characters..."
			autocomplete="off"
			maxlength="512"
			role="combobox"
			aria-autocomplete="list"
			aria-controls="tag-suggestions"
			aria-expanded={focused && suggestions.length > 0}
			aria-activedescendant={active >= 0 ? `suggestion-${active}` : undefined}
			onfocus={() => (focused = true)}
			onblur={() => {
				focused = false;
			}}
			onkeydown={keydown}
		/>
		<kbd>/</kbd>
		<button class="icon-button" type="submit" aria-label="Search"><ArrowUpRight size={18} /></button
		>
	</form>
	<SearchHelp />
	{#if focused && suggestions.length}
		<ul id="tag-suggestions" class="suggestions" role="listbox" aria-label="Tag suggestions">
			{#each suggestions as tag, index}
				<li id={`suggestion-${index}`} role="option" aria-selected={active === index}>
					<button
						type="button"
						class:highlighted={active === index}
						onpointerdown={(event) => event.preventDefault()}
						onclick={() => select(tag.name)}
						tabindex="-1"
						><span class={`tag-text ${tag.category}`}>{tag.name}</span><span class="muted"
							>{tag.count}</span
						></button
					>
				</li>
			{/each}
		</ul>
	{/if}
</div>
