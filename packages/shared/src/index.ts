import { z } from 'zod';

export const ratings = ['safe', 'questionable', 'explicit'] as const;
export const categories = ['general', 'artist', 'character', 'copyright', 'meta'] as const;
export const tagName = z
	.string()
	.trim()
	.toLowerCase()
	.min(1)
	.max(80)
	.regex(
		/^[\p{L}\p{N}_()][\p{L}\p{N}_()\-.]*$/u,
		'Use letters, numbers, hyphens or underscores in tags.',
	);

export function parseTags(input: string): string[] {
	const tags = [
		...new Set(
			input
				.trim()
				.split(/[\s,]+/)
				.filter(Boolean)
				.map((s) => tagName.parse(s)),
		),
	];
	if (tags.length < 1 || tags.length > 50) throw new Error('Add between 1 and 50 tags.');
	return tags;
}

export const postInput = z.object({
	title: z.string().trim().max(160).default(''),
	tags: z
		.string()
		.max(4050)
		.transform((value, ctx) => {
			try {
				return parseTags(value);
			} catch {
				ctx.addIssue({
					code: 'custom',
					message: 'Enter 1 to 50 valid tags, separated by spaces.',
				});
				return z.NEVER;
			}
		}),
	rating: z.enum(ratings),
	source: z
		.union([
			z.literal(''),
			z
				.url()
				.max(2048)
				.refine(
					(s) => ['https:', 'http:'].includes(new URL(s).protocol),
					'The source must be an HTTP or HTTPS URL.',
				),
		])
		.default(''),
});

export type Role = 'member' | 'moderator' | 'admin';
export type PostStatus = 'queued' | 'processing' | 'pending' | 'published' | 'rejected' | 'failed';
export type Actor = { id: string; role: string };
