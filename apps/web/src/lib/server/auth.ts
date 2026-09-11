import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { getDb } from '@mochi/db';
import * as schema from '@mochi/db/schema';
import { getConfig } from '@mochi/shared/config';

function createAuth() {
	const config = getConfig();
	return betterAuth({
		appName: config.SITE_NAME,
		baseURL: config.ORIGIN,
		secret: config.BETTER_AUTH_SECRET,
		advanced: { ipAddress: { ipAddressHeaders: ['x-mochi-client-ip'] } },
		database: drizzleAdapter(getDb(), { provider: 'pg', schema }),
		emailAndPassword: {
			enabled: true,
			disableSignUp: !config.REGISTRATION_OPEN,
			minPasswordLength: 12,
		},
		user: {
			additionalFields: {
				role: { type: 'string', required: true, defaultValue: 'member', input: false },
			},
		},
		session: {
			expiresIn: 60 * 60 * 24 * 14,
			updateAge: 60 * 60 * 24,
			cookieCache: { enabled: false },
		},
		rateLimit: {
			enabled: true,
			window: 60,
			max: 60,
			customRules: {
				'/sign-in/email': { window: 60, max: 10 },
				'/sign-up/email': { window: 60, max: 5 },
			},
		},
	});
}
let auth: ReturnType<typeof createAuth> | undefined;
export const getAuth = () => (auth ??= createAuth());
export type AuthSession = ReturnType<typeof createAuth>['$Infer']['Session'];
