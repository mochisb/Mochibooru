# Architecture

## Modular application with two processes

The web app and worker share TypeScript contracts, PostgreSQL and storage. SvelteKit handles SSR, navigation, forms and endpoints; authorization and editing rules live in `packages/core`.

The interface uses Svelte 5, Tailwind CSS, Lucide and Bits UI for the accessible help dialog. Better Auth manages accounts and sessions through its Drizzle adapter. The `role` property is assigned by the server and is not accepted as client input.

## Data

- `user`, `session`, `account`, `verification`: authentication.
- `posts`: status, rating, uploader, storage keys, hash and metadata.
- `tags`, `post_tags`: many-to-many relationship. The schema supports general, artist, character, copyright and meta categories; new tags are created as general.
- `post_revisions`: creation, editing and moderation history with before and after values.
- `favorites`: unique relationship between a user and a post.

SQL migrations are generated with Drizzle Kit and stored in `packages/db/migrations`. Migration history prevents already-applied changes from running again. Metadata changes and their revisions are written in the same transaction, which locks the post during editing.

## Uploading and processing

1. The web app requires a session and a valid origin, limits the actual body size and validates metadata with Zod.
2. It calculates SHA-256 and stores the original under a generated UUID key.
3. It inserts the post, tags and revision within a transaction. The hash has a unique constraint; if the transaction fails, the newly stored object is deleted.
4. The `queued` row is a durable record of pending work. Every five seconds, the worker reconciles it with BullMQ using the post ID as the job ID.
5. The worker decodes the image with Sharp, applies orientation and writes WebP derivatives to deterministic keys. Previews are limited to 1800 px and thumbnails to 480 px, without enlarging small images.
6. On completion, the post becomes `published`, or `pending` if review is required.

```text
queued → processing → published
                    → pending → published / rejected
                    → failed → queued (manual retry)
```

Transient failures receive up to three attempts with exponential backoff. Invalid files fail permanently. Reconciliation also recovers stale `processing` jobs when their Redis entry disappears. Jobs that have already finished or entered review are not processed again.

Originals retain their bytes and animation. Previews are static, oriented and stripped of EXIF data. Supported formats are JPEG, PNG, WebP, GIF and AVIF, up to 40 million pixels per image/frame and 1000 frames; SVG and other formats are rejected even if supported by the decoder.

The SQL transaction and object storage do not form a distributed transaction. An abrupt shutdown between storing the object and recording the row can leave an orphaned original. The future cleanup job will need to compare keys against PostgreSQL and apply an age threshold.

## Permissions

| Operation                 | Visitor | Member                         | Moderator / administrator |
| ------------------------- | ------- | ------------------------------ | ------------------------- |
| View published posts      | Yes     | Yes                            | Yes                       |
| View nonpublic posts      | No      | Own posts                      | All posts                 |
| Upload and save favorites | No      | Yes                            | Yes                       |
| Edit metadata             | No      | Own published or pending posts | Yes                       |
| Approve or remove posts   | No      | No                             | Yes                       |

Media routes perform the same checks as the post page. Even conditional ETag requests check permissions before returning `304`. Internal processing errors are not exposed to users as technical messages.

Administrator promotion is performed through the CLI. Sessions query the database without cookie caching to reflect role changes. Authentication rate limits use the IP resolved by SvelteKit; the internal header is overwritten in the hook to prevent clients from choosing their rate-limit identifier.

## Search

`packages/search` turns a query into a structured representation independent of SQL. `packages/core` compiles it into parameterized queries using `EXISTS` / `NOT EXISTS` for tags, comparisons for dimensions and stable ordering by date and ID. Only parser-validated operators enter the SQL structure.

The alpha uses bounded offset pagination and calculates counts at query time. Before targeting millions of posts, query plans need to be measured with `EXPLAIN ANALYZE`, cursor pagination introduced and aggregates materialized based on the results. An external search engine would be a later decision informed by those measurements.

## Distribution

Compose includes PostgreSQL 17, Redis 7, a migration job, the web app and the worker. All application processes run with Bun. Local storage is shared through a volume; running the web app and worker on different servers requires S3 or equivalent shared storage.

`GET /api/health` checks the web app and PostgreSQL. Monitoring the worker and queue age is an additional operational task; the health endpoint does not represent the full processing status.
