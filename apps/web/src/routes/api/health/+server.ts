import { json } from '@sveltejs/kit';
import { getDb } from '@mochi/db';
import { sql } from 'drizzle-orm';

export const GET = async () => {
	try {
		await getDb().execute(sql`select 1`);
		return json({ status: 'ok' });
	} catch {
		return json({ status: 'unavailable' }, { status: 503 });
	}
};
