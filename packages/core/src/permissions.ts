import type { Actor, PostStatus } from '@mochi/shared';

type Subject = { uploaderId: string; status: PostStatus };
export const canModerate = (actor: Actor | null | undefined) =>
	actor?.role === 'admin' || actor?.role === 'moderator';
export const canViewPost = (actor: Actor | null | undefined, post: Subject) =>
	post.status === 'published' || (!!actor && (actor.id === post.uploaderId || canModerate(actor)));
export const canEditPost = (actor: Actor | null | undefined, post: Subject) =>
	!!actor &&
	(canModerate(actor) ||
		(actor.id === post.uploaderId && ['published', 'pending'].includes(post.status)));
