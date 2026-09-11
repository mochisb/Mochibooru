import { eq } from 'drizzle-orm';
import { getDb, closeDb, user } from '@mochi/db';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw new Error('Uso: bun run admin:promote usuario@example.com');
try {
	const updated = await getDb()
		.update(user)
		.set({ role: 'admin', updatedAt: new Date() })
		.where(eq(user.email, email))
		.returning({ id: user.id });
	if (!updated.length) throw new Error('Crea primero la cuenta desde la página de registro.');
	console.info(`La cuenta ${email} ahora es administradora.`);
} finally {
	await closeDb();
}
