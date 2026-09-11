import { expect, test } from 'bun:test';
import { canEditPost, canViewPost, canModerate } from './permissions';
import type { PostStatus } from '@mochi/shared';

const owner = { id: 'owner', role: 'member' };
const stranger = { id: 'stranger', role: 'member' };
const moderator = { id: 'moderator', role: 'moderator' };

test.each(['queued', 'processing', 'pending', 'rejected', 'failed'] as PostStatus[])(
	'protects nonpublic %s posts and their media',
	(status) => {
		const post = { uploaderId: owner.id, status };
		expect(canViewPost(null, post)).toBe(false);
		expect(canViewPost(stranger, post)).toBe(false);
		expect(canViewPost(owner, post)).toBe(true);
		expect(canViewPost(moderator, post)).toBe(true);
	},
);
test('only owner or moderator can edit a publication', () => {
	const post = { uploaderId: owner.id, status: 'published' as const };
	expect(canViewPost(null, post)).toBe(true);
	expect(canEditPost(null, post)).toBe(false);
	expect(canEditPost(stranger, post)).toBe(false);
	expect(canEditPost(owner, post)).toBe(true);
	expect(canEditPost(moderator, post)).toBe(true);
});
test('owners cannot republish rejected content by editing it', () => {
	expect(canEditPost(owner, { uploaderId: owner.id, status: 'rejected' })).toBe(false);
});
test('moderator checks fail closed for unknown roles', () => {
	expect(canModerate({ id: 'x', role: 'administrator' })).toBe(false);
	expect(canModerate(owner)).toBe(false);
	expect(canModerate(null)).toBe(false);
});
