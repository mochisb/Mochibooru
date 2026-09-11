import { error, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { canModerate } from '@mochi/core/permissions';

export function requireUser(event: Pick<RequestEvent, 'locals'>) {
	if (!event.locals.user) error(401, 'Inicia sesión para continuar.');
	return event.locals.user;
}
export function requireModerator(event: Pick<RequestEvent, 'locals'>) {
	const user = requireUser(event);
	if (!canModerate(user)) error(403, 'Necesitas permisos de moderación.');
	return user;
}
export function requireSameOrigin(event: Pick<RequestEvent, 'request' | 'url'>) {
	if (event.request.headers.get('origin') !== event.url.origin)
		error(403, 'Origen de la petición no válido.');
}
export function postId(value: string) {
	if (!z.uuid().safeParse(value).success) error(404, 'Publicación no encontrada.');
	return value;
}
export function pageNumber(value: string | null) {
	if (!value) return 1;
	if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 250)
		error(
			400,
			'La página debe estar entre 1 y 250. Refina la búsqueda para explorar más resultados.',
		);
	return Number(value);
}
