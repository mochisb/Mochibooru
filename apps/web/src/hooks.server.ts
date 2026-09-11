import { building } from '$app/environment';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import type { Handle } from '@sveltejs/kit';
import { getAuth } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.session = null;
	if (building) return resolve(event);
	// Overwrite the internal header: clients cannot choose their rate-limit bucket.
	event.request.headers.set('x-mochi-client-ip', event.getClientAddress());
	const auth = getAuth();
	if (event.request.headers.has('cookie')) {
		const session = await auth.api.getSession({ headers: event.request.headers });
		event.locals.user = session?.user ?? null;
		event.locals.session = session?.session ?? null;
	}
	const response = await svelteKitHandler({ event, resolve, auth, building });
	if (response.headers.get('content-type')?.includes('text/html')) {
		response.headers.set('Content-Language', 'en');
	}
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Frame-Options', 'DENY');
	if (event.locals.user && !response.headers.has('cache-control'))
		response.headers.set('Cache-Control', 'private, no-store');
	return response;
};
