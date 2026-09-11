import { redirect } from '@sveltejs/kit';
import { getConfig } from '@mochi/shared/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/login?next=/upload');
	return { maxUploadMb: getConfig().MAX_UPLOAD_MB, requireApproval: getConfig().REQUIRE_APPROVAL };
};
