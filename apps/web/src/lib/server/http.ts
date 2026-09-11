import { error, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { canModerate } from '@mochi/core/permissions';

export function requireUser(event: Pick<RequestEvent, 'locals'>) {
	if (!event.locals.user) error(401, 'Sign in to continue.');
	return event.locals.user;
}
export function requireModerator(event: Pick<RequestEvent, 'locals'>) {
	const user = requireUser(event);
	if (!canModerate(user)) error(403, 'Moderator permissions are required.');
	return user;
}
export function requireSameOrigin(event: Pick<RequestEvent, 'request' | 'url'>) {
	if (event.request.headers.get('origin') !== event.url.origin)
		error(403, 'Invalid request origin.');
}
export function postId(value: string) {
	if (!z.uuid().safeParse(value).success) error(404, 'Post not found.');
	return value;
}
export function pageNumber(value: string | null) {
	if (!value) return 1;
	if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 250)
		error(400, 'The page must be between 1 and 250. Refine your search to explore more results.');
	return Number(value);
}
