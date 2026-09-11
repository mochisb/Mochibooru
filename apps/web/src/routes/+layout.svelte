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
				logoutError = 'No se pudo cerrar la sesión.';
				return;
			}
			await invalidateAll();
			await goto('/');
		} catch {
			logoutError = 'No se pudo conectar. Inténtalo de nuevo.';
		}
	}
	const moderator = $derived(data.user?.role === 'moderator' || data.user?.role === 'admin');
</script>

<svelte:head
	><title>{data.siteName} — Tu pequeño universo visual</title><meta
		name="description"
		content="Descubre, organiza y comparte imágenes con una comunidad que cuida los detalles."
	/></svelte:head
>
<a class="skip-link" href="#main">Saltar al contenido</a>
<div class="app-shell">
	<aside class="sidebar">
		<a href="/" class="brand"
			><img src="/favicon.svg" alt="" width="38" height="38" /><span
				>{data.siteName}<small>un pequeño universo visual</small></span
			></a
		>
		<div class="nav-section-label">TU ESPACIO</div>
		<nav class="main-nav" aria-label="Navegación principal">
			<a class:active={page.url.pathname === '/' && !page.url.searchParams.has('view')} href="/"
				><Compass size={19} /> Explorar <span class="nav-dot"></span></a
			>
			<a
				class:active={page.url.searchParams.get('view') === 'favorites'}
				href={data.user ? '/?view=favorites' : '/login?next=/%3Fview=favorites'}
				><Heart size={19} /> Favoritos</a
			>
			<a
				class:active={page.url.pathname === '/uploads'}
				href={data.user ? '/uploads' : '/login?next=/uploads'}><Images size={19} /> Mis subidas</a
			>
			{#if moderator}<a class:active={page.url.pathname === '/moderation'} href="/moderation"
					><ShieldCheck size={19} /> Moderación</a
				>{/if}
		</nav>
		<div class="sidebar-card">
			<span class="mini-orbit">✦</span>
			<h3>Una colección, mil conexiones.</h3>
			<p>Cada etiqueta abre una nueva forma de descubrir.</p>
			<a href="/upload">Comparte una imagen <ArrowUpRight size={15} /></a>
		</div>
		<div class="sidebar-bottom">
			<span class="live-dot"></span> Hecho para comunidades <span class="version">α 0.1</span>
		</div>
	</aside>
	<div class="workspace">
		<header class="topbar">
			<div class="breadcrumb">
				<span>{data.siteName}</span><span class="muted">/</span><strong
					>{page.url.pathname === '/upload'
						? 'Nueva publicación'
						: page.url.pathname === '/uploads'
							? 'Mis subidas'
							: page.url.pathname === '/moderation'
								? 'Moderación'
								: page.url.pathname === '/login'
									? 'Tu cuenta'
									: 'Explorar'}</strong
				>
			</div>
			<div class="row top-actions">
				<button
					class="icon-button"
					onclick={toggleTheme}
					aria-label={light ? 'Activar tema oscuro' : 'Activar tema claro'}
					>{#if light}<Moon size={18} />{:else}<Sun size={18} />{/if}</button
				>
				<a href="/upload" class="button primary small-button"
					><Plus size={17} /><span>Subir imagen</span></a
				>
				{#if data.user}<span class="avatar" title={data.user.name}
						>{data.user.name.slice(0, 1).toUpperCase()}</span
					><button class="icon-button" onclick={logout} aria-label="Cerrar sesión"
						><LogOut size={17} /></button
					>{:else}<a class="login-link" href="/login">Entrar <ArrowUpRight size={14} /></a>{/if}
			</div>
		</header>
		{#if logoutError}<p class="notice error" role="alert">{logoutError}</p>{/if}
		<main id="main">{@render children()}</main>
		<footer class="footer">
			<span>{data.siteName} <span class="muted">· Un lugar para lo que te inspira.</span></span><a
				href="/upload"><Upload size={13} /> Construyámoslo juntos</a
			>
		</footer>
	</div>
</div>
