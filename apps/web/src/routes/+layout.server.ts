import { getConfig } from '@mochi/shared/config';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
	user: locals.user ? { id: locals.user.id, name: locals.user.name, role: locals.user.role } : null,
	siteName: getConfig().SITE_NAME,
	registrationOpen: getConfig().REGISTRATION_OPEN,
});
