import { eq } from 'drizzle-orm';
import { getDb, closeDb, user } from '@mochi/db';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw new Error('Usage: bun run admin:promote user@example.com');
try {
	const updated = await getDb()
		.update(user)
		.set({ role: 'admin', updatedAt: new Date() })
		.where(eq(user.email, email))
		.returning({ id: user.id });
	if (!updated.length) throw new Error('Create the account on the registration page first.');
	console.info(`The account ${email} is now an administrator.`);
} finally {
	await closeDb();
}
