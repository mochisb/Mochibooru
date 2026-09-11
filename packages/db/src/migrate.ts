import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import { getDb, closeDb } from './index';

try {
	await migrate(getDb(), {
		migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)),
	});
	console.info('Migraciones aplicadas.');
} finally {
	await closeDb();
}
