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
					? 'Unable to create your account. Check your details or try another email address.'
					: 'Unable to sign in. Check your email and password.';
				return;
			}
			const next = page.url.searchParams.get('next') ?? '/';
			await invalidateAll();
			await goto(
				next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/',
			);
		} catch {
			message = 'Unable to connect to the server. Please try again.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>{register ? 'Create account' : 'Sign in'} · {data.siteName}</title></svelte:head
>
<div class="auth-container">
	<div class="auth-art">
		<img src="/favicon.svg" alt="" width="70" height="70" /><span class="eyebrow"
			>YOUR LITTLE VISUAL UNIVERSE</span
		>
		<h1>A place for<br />what <em>inspires you.</em></h1>
		<p>Discover unexpected connections.<br />Build a collection all your own.</p>
		<div class="auth-orbit" aria-hidden="true">✳</div>
	</div>
	<section class="auth-form panel">
		<h2>{register ? 'Create your space' : 'Welcome back'}</h2>
		<p class="muted">
			{register ? 'Your next collection starts here.' : 'Sign in to save, share and discover.'}
		</p>
		<form onsubmit={submit} class="form-stack">
			{#if register}<label
					>Name<input
						name="name"
						bind:value={name}
						required
						minlength="2"
						maxlength="60"
						autocomplete="nickname"
					/></label
				>{/if}<label
				>Email address<input
					name="email"
					type="email"
					bind:value={email}
					required
					autocomplete="email"
					maxlength="254"
					placeholder="you@example.com"
				/></label
			><label
				>Password<input
					name="password"
					type="password"
					bind:value={password}
					required
					minlength={register ? 12 : 1}
					maxlength="128"
					autocomplete={register ? 'new-password' : 'current-password'}
				/></label
			>{#if register}<span class="muted small">At least 12 characters.</span>{/if}{#if message}<p
					class="notice error"
					role="alert"
				>
					{message}
				</p>{/if}<button class="button primary" disabled={busy}
				>{#if busy}<LoaderCircle size={17} class="spin" />{:else}{register
						? 'Create account'
						: 'Sign in'}<ArrowRight size={17} />{/if}</button
			>
		</form>
		{#if data.registrationOpen}<p class="auth-switch">
				{register ? 'Already have an account?' : 'First time here?'}
				<a
					href={`/login?mode=${register ? 'login' : 'register'}&next=${encodeURIComponent(page.url.searchParams.get('next') ?? '/')}`}
					>{register ? 'Sign in' : 'Create an account'}</a
				>
			</p>{:else}<p class="muted small">Registration is closed for this community.</p>{/if}
	</section>
</div>
