<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import { Compass, Heart, Upload, Images, ShieldCheck, LogOut, Sun, Moon } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { authClient } from '$lib/auth-client';
	let { data, children } = $props();
	let light = $state(false);
	let logoutError = $state('');
	onMount(() => {
		try {
			light = localStorage.getItem('mochi-theme') === 'light';
		} catch {
			/* Storage may be disabled. */
		}
		document.documentElement.dataset.theme = light ? 'light' : 'dark';
	});
	function toggleTheme() {
		light = !light;
		document.documentElement.dataset.theme = light ? 'light' : 'dark';
		try {
			localStorage.setItem('mochi-theme', light ? 'light' : 'dark');
		} catch {
			/* Theme still works for this visit. */
		}
	}
	async function logout() {
		try {
			const result = await authClient.signOut();
			if (result.error) {
				logoutError = 'Unable to sign out.';
				return;
			}
			await invalidateAll();
			await goto('/');
		} catch {
			logoutError = 'Unable to connect. Please try again.';
		}
	}
	const moderator = $derived(data.user?.role === 'moderator' || data.user?.role === 'admin');
	const isActive = (path: string) => page.url.pathname === path;
</script>

<svelte:head
	><title>{data.siteName}</title><meta
		name="description"
		content="A self-hosted image gallery and booru."
	/></svelte:head
>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
	<a href="/" class="brand"
		><img src="/favicon.svg" alt="" width="28" height="28" /><span>{data.siteName}</span></a
	>
	<nav class="main-nav" aria-label="Main navigation">
		<a class:active={isActive('/')} href="/"><Compass size={18} /><span>Explore</span></a>
		<a
			class:active={page.url.searchParams.get('view') === 'favorites'}
			href={data.user ? '/?view=favorites' : '/login?next=/%3Fview=favorites'}
			><Heart size={18} /><span>Favorites</span></a
		>
		<a class:active={isActive('/uploads')} href={data.user ? '/uploads' : '/login?next=/uploads'}
			><Images size={18} /><span>Uploads</span></a
		>
		{#if moderator}<a class:active={isActive('/moderation')} href="/moderation"
				><ShieldCheck size={18} /><span>Moderation</span></a
			>{/if}
	</nav>
	<div class="header-actions">
		<a href="/upload" class="button primary small-button"><Upload size={15} /> Upload</a>
		<button
			class="icon-button"
			onclick={toggleTheme}
			aria-label={light ? 'Switch to dark theme' : 'Switch to light theme'}
			>{#if light}<Moon size={18} />{:else}<Sun size={18} />{/if}</button
		>
		{#if data.user}<span class="avatar" title={data.user.name}
				>{data.user.name.slice(0, 1).toUpperCase()}</span
			><button class="icon-button" onclick={logout} aria-label="Sign out"
				><LogOut size={17} /></button
			>{:else}<a class="button secondary small-button" href="/login">Sign in</a>{/if}
	</div>
</header>
{#if logoutError}<p class="notice error" role="alert">{logoutError}</p>{/if}
<main id="main">{@render children()}</main>
<footer class="footer">
	<span>{data.siteName}</span>
	<a
		href="https://github.com/mochisb/Mochibooru"
		target="_blank"
		rel="noreferrer"
		class="text-link muted"
	>
		Powered by Mochibooru · open source
	</a>
</footer>
