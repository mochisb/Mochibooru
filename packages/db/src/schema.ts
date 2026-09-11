import {
	pgTable,
	pgEnum,
	text,
	timestamp,
	boolean,
	integer,
	bigint,
	uuid,
	primaryKey,
	index,
	uniqueIndex,
	jsonb,
} from 'drizzle-orm/pg-core';

const date = (name: string) => timestamp(name, { withTimezone: true });
export const roleEnum = pgEnum('role', ['member', 'moderator', 'admin']);
export const ratingEnum = pgEnum('rating', ['safe', 'questionable', 'explicit']);
export const statusEnum = pgEnum('post_status', [
	'queued',
	'processing',
	'pending',
	'published',
	'rejected',
	'failed',
]);
export const categoryEnum = pgEnum('tag_category', [
	'general',
	'artist',
	'character',
	'copyright',
	'meta',
]);

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull().default(false),
	image: text('image'),
	role: roleEnum('role').notNull().default('member'),
	createdAt: date('created_at').notNull().defaultNow(),
	updatedAt: date('updated_at').notNull().defaultNow(),
});
export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: date('expires_at').notNull(),
		token: text('token').notNull().unique(),
		createdAt: date('created_at').notNull().defaultNow(),
		updatedAt: date('updated_at').notNull().defaultNow(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
	},
	(t) => [index('session_user_idx').on(t.userId)],
);
export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: date('access_token_expires_at'),
		refreshTokenExpiresAt: date('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		createdAt: date('created_at').notNull().defaultNow(),
		updatedAt: date('updated_at').notNull().defaultNow(),
	},
	(t) => [
		index('account_user_idx').on(t.userId),
		uniqueIndex('account_provider_idx').on(t.providerId, t.accountId),
	],
);
export const verification = pgTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: date('expires_at').notNull(),
		createdAt: date('created_at').notNull().defaultNow(),
		updatedAt: date('updated_at').notNull().defaultNow(),
	},
	(t) => [index('verification_identifier_idx').on(t.identifier)],
);

export const posts = pgTable(
	'posts',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		uploaderId: text('uploader_id')
			.notNull()
			.references(() => user.id),
		title: text('title').notNull().default(''),
		source: text('source').notNull().default(''),
		rating: ratingEnum('rating').notNull().default('safe'),
		status: statusEnum('status').notNull().default('queued'),
		sha256: text('sha256').notNull().unique(),
		originalKey: text('original_key').notNull(),
		previewKey: text('preview_key'),
		thumbnailKey: text('thumbnail_key'),
		mime: text('mime'),
		width: integer('width'),
		height: integer('height'),
		bytes: bigint('bytes', { mode: 'number' }).notNull(),
		animated: boolean('animated').notNull().default(false),
		processingError: text('processing_error'),
		createdAt: date('created_at').notNull().defaultNow(),
		updatedAt: date('updated_at').notNull().defaultNow(),
	},
	(t) => [
		index('posts_gallery_idx').on(t.status, t.rating, t.createdAt, t.id),
		index('posts_uploader_idx').on(t.uploaderId, t.createdAt),
		index('posts_processing_idx').on(t.status, t.updatedAt),
	],
);
export const tags = pgTable('tags', {
	id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
	name: text('name').notNull().unique(),
	category: categoryEnum('category').notNull().default('general'),
});
export const postTags = pgTable(
	'post_tags',
	{
		postId: uuid('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		tagId: integer('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' }),
	},
	(t) => [
		primaryKey({ columns: [t.postId, t.tagId] }),
		index('post_tags_tag_idx').on(t.tagId, t.postId),
	],
);
export const postRevisions = pgTable(
	'post_revisions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		postId: uuid('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		actorId: text('actor_id')
			.notNull()
			.references(() => user.id),
		action: text('action').notNull(),
		before: jsonb('before'),
		after: jsonb('after'),
		createdAt: date('created_at').notNull().defaultNow(),
	},
	(t) => [index('revisions_post_idx').on(t.postId, t.createdAt)],
);
export const favorites = pgTable(
	'favorites',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		postId: uuid('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
	},
	(t) => [primaryKey({ columns: [t.userId, t.postId] }), index('favorites_post_idx').on(t.postId)],
);
