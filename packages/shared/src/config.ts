import { isAbsolute } from 'node:path';
import { z } from 'zod';

const bool = (fallback: string) =>
	z
		.enum(['true', 'false'])
		.default(fallback as 'true' | 'false')
		.transform((s) => s === 'true');
const schema = z
	.object({
		DATABASE_URL: z.url(),
		REDIS_URL: z.url(),
		BETTER_AUTH_SECRET: z
			.string()
			.min(32)
			.refine(
				(s) => !s.startsWith('replace-with'),
				'Genera un secreto aleatorio para BETTER_AUTH_SECRET.',
			),
		ORIGIN: z.url(),
		SITE_NAME: z.string().min(1).max(80).default('Mochibooru'),
		REGISTRATION_OPEN: bool('true'),
		REQUIRE_APPROVAL: bool('false'),
		MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(100).default(20),
		STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
		STORAGE_PATH: z.string().default('/data/media'),
		S3_ENDPOINT: z.string().optional(),
		S3_REGION: z.string().default('us-east-1'),
		S3_BUCKET: z.string().optional(),
		S3_ACCESS_KEY_ID: z.string().optional(),
		S3_SECRET_ACCESS_KEY: z.string().optional(),
		S3_FORCE_PATH_STYLE: bool('false'),
	})
	.superRefine((config, ctx) => {
		if (config.STORAGE_DRIVER === 'local' && !isAbsolute(config.STORAGE_PATH))
			ctx.addIssue({
				code: 'custom',
				path: ['STORAGE_PATH'],
				message: 'STORAGE_PATH debe ser una ruta absoluta compartida por web y worker.',
			});
		if (config.STORAGE_DRIVER === 's3') {
			for (const field of ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const)
				if (!config[field])
					ctx.addIssue({ code: 'custom', path: [field], message: 'Obligatorio para S3.' });
		}
	});

let cached: z.infer<typeof schema> | undefined;
export function getConfig() {
	return (cached ??= schema.parse(process.env));
}
