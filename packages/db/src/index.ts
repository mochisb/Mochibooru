import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

function connect() {
	if (!process.env.DATABASE_URL)
		throw new Error('Falta DATABASE_URL. Configura .env antes de iniciar Mochibooru.');
	const client = postgres(process.env.DATABASE_URL, {
		max: 10,
		idle_timeout: 20,
		connect_timeout: 5,
	});
	return { client, db: drizzle(client, { schema }) };
}
let connection: ReturnType<typeof connect> | undefined;
export function getDb() {
	return (connection ??= connect()).db;
}
export async function closeDb() {
	await connection?.client.end();
	connection = undefined;
}
export type Database = ReturnType<typeof getDb>;
export * from './schema';
