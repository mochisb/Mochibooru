<script lang="ts">
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import { ArrowRight, LoaderCircle } from 'lucide-svelte';
	import { authClient } from '$lib/auth-client';
	let { data } = $props();
	const register = $derived(
		page.url.searchParams.get('mode') === 'register' && data.registrationOpen,
	);
	let name = $state('');
	let email = $state('');
	let password = $state('');
	let busy = $state(false);
	let message = $state('');
	async function submit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		message = '';
		try {
			const result = register
				? await authClient.signUp.email({ name, email, password })
				: await authClient.signIn.email({ email, password });
			if (result.error) {
				message = register
					? 'No se pudo crear la cuenta. Comprueba los datos o prueba con otro correo.'
					: 'No se pudo iniciar sesión. Comprueba tu correo y contraseña.';
				return;
			}
			const next = page.url.searchParams.get('next') ?? '/';
			await invalidateAll();
			await goto(
				next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/',
			);
		} catch {
			message = 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>{register ? 'Crear cuenta' : 'Entrar'} · {data.siteName}</title></svelte:head>
<div class="auth-container">
	<div class="auth-art">
		<img src="/favicon.svg" alt="" width="70" height="70" /><span class="eyebrow"
			>TU PEQUEÑO UNIVERSO VISUAL</span
		>
		<h1>Un lugar para<br />lo que te <em>inspira.</em></h1>
		<p>Descubre conexiones inesperadas.<br />Construye una colección muy tuya.</p>
		<div class="auth-orbit" aria-hidden="true">✳</div>
	</div>
	<section class="auth-form panel">
		<h2>{register ? 'Crea tu espacio' : 'Qué bueno verte de nuevo'}</h2>
		<p class="muted">
			{register
				? 'Tu próxima colección empieza aquí.'
				: 'Entra para guardar, compartir y descubrir.'}
		</p>
		<form onsubmit={submit} class="form-stack">
			{#if register}<label
					>Nombre<input
						name="name"
						bind:value={name}
						required
						minlength="2"
						maxlength="60"
						autocomplete="nickname"
					/></label
				>{/if}<label
				>Correo electrónico<input
					name="email"
					type="email"
					bind:value={email}
					required
					autocomplete="email"
					maxlength="254"
					placeholder="tu@correo.com"
				/></label
			><label
				>Contraseña<input
					name="password"
					type="password"
					bind:value={password}
					required
					minlength={register ? 12 : 1}
					maxlength="128"
					autocomplete={register ? 'new-password' : 'current-password'}
				/></label
			>{#if register}<span class="muted small">Al menos 12 caracteres.</span>{/if}{#if message}<p
					class="notice error"
					role="alert"
				>
					{message}
				</p>{/if}<button class="button primary" disabled={busy}
				>{#if busy}<LoaderCircle size={17} class="spin" />{:else}{register
						? 'Crear cuenta'
						: 'Entrar'}<ArrowRight size={17} />{/if}</button
			>
		</form>
		{#if data.registrationOpen}<p class="auth-switch">
				{register ? '¿Ya tienes cuenta?' : '¿Es tu primera visita?'}
				<a
					href={`/login?mode=${register ? 'login' : 'register'}&next=${encodeURIComponent(page.url.searchParams.get('next') ?? '/')}`}
					>{register ? 'Inicia sesión' : 'Crea una cuenta'}</a
				>
			</p>{:else}<p class="muted small">El registro está cerrado en esta comunidad.</p>{/if}
	</section>
</div>
