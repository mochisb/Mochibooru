<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import {
		Compass,
		Heart,
		Upload,
		Images,
		ShieldCheck,
		Plus,
		LogOut,
		Sun,
		Moon,
		ArrowUpRight,
	} from 'lucide-svelte';
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
</script>

<svelte:head
	><title>{data.siteName} — Your little visual universe</title><meta
		name="description"
		content="Discover, organize and share images with a community that cares about the details."
	/></svelte:head
>
<a class="skip-link" href="#main">Skip to content</a>
<div class="app-shell">
	<aside class="sidebar">
		<a href="/" class="brand"
			><img src="/favicon.svg" alt="" width="38" height="38" /><span
				>{data.siteName}<small>a little visual universe</small></span
			></a
		>
		<div class="nav-section-label">YOUR SPACE</div>
		<nav class="main-nav" aria-label="Main navigation">
			<a class:active={page.url.pathname === '/' && !page.url.searchParams.has('view')} href="/"
				><Compass size={19} /> Explore <span class="nav-dot"></span></a
			>
			<a
				class:active={page.url.searchParams.get('view') === 'favorites'}
				href={data.user ? '/?view=favorites' : '/login?next=/%3Fview=favorites'}
				><Heart size={19} /> Favorites</a
			>
			<a
				class:active={page.url.pathname === '/uploads'}
				href={data.user ? '/uploads' : '/login?next=/uploads'}><Images size={19} /> My uploads</a
			>
			{#if moderator}<a class:active={page.url.pathname === '/moderation'} href="/moderation"
					><ShieldCheck size={19} /> Moderation</a
				>{/if}
		</nav>
		<div class="sidebar-card">
			<span class="mini-orbit">✦</span>
			<h3>One collection, endless connections.</h3>
			<p>Every tag opens a new path to discovery.</p>
			<a href="/upload">Share an image <ArrowUpRight size={15} /></a>
		</div>
		<div class="sidebar-bottom">
			<span class="live-dot"></span> Built for communities <span class="version">α 0.1</span>
		</div>
	</aside>
	<div class="workspace">
		<header class="topbar">
			<div class="breadcrumb">
				<span>{data.siteName}</span><span class="muted">/</span><strong
					>{page.url.pathname === '/upload'
						? 'New post'
						: page.url.pathname === '/uploads'
							? 'My uploads'
							: page.url.pathname === '/moderation'
								? 'Moderation'
								: page.url.pathname === '/login'
									? 'Your account'
									: 'Explore'}</strong
				>
			</div>
			<div class="row top-actions">
				<button
					class="icon-button"
					onclick={toggleTheme}
					aria-label={light ? 'Switch to dark theme' : 'Switch to light theme'}
					>{#if light}<Moon size={18} />{:else}<Sun size={18} />{/if}</button
				>
				<a href="/upload" class="button primary small-button"
					><Plus size={17} /><span>Upload image</span></a
				>
				{#if data.user}<span class="avatar" title={data.user.name}
						>{data.user.name.slice(0, 1).toUpperCase()}</span
					><button class="icon-button" onclick={logout} aria-label="Sign out"
						><LogOut size={17} /></button
					>{:else}<a class="login-link" href="/login">Sign in <ArrowUpRight size={14} /></a>{/if}
			</div>
		</header>
		{#if logoutError}<p class="notice error" role="alert">{logoutError}</p>{/if}
		<main id="main">{@render children()}</main>
		<footer class="footer">
			<span>{data.siteName} <span class="muted">· A place for what inspires you.</span></span><a
				href="/upload"><Upload size={13} /> Let's build it together</a
			>
		</footer>
	</div>
</div>
