# Alpha v1 API

## Query posts

```http
GET /api/v1/posts?q=landscape%20-dog%20width:>=640&page=1
```

Returns `{ posts, hasNext }`. Each post includes its tags, metadata, `thumbnailUrl` and `previewUrl`. Only published posts are returned. This endpoint shares the gallery's parser, filters and limits.

An invalid query returns `400`; the page must be between 1 and 250.

## Autocomplete

```http
GET /api/v1/tags?q=land
```

Returns `{ tags: [{ id, name, category, count }] }`. Searches by literal prefix, with a maximum of twelve results. Counts reflect published `safe` posts.

## Upload an image

```http
POST /api/v1/posts
Content-Type: multipart/form-data; boundary=...
Origin: https://your-community.example
Cookie: <session>
```

| Field    | Requirement                                           |
| -------- | ----------------------------------------------------- |
| `file`   | One image file.                                       |
| `tags`   | Between 1 and 50 tags, separated by spaces or commas. |
| `rating` | `safe`, `questionable` or `explicit`.                 |
| `title`  | Optional, up to 160 characters.                       |
| `source` | Optional HTTP/HTTPS URL, up to 2048 characters.       |

Response `201`:

```json
{ "id": "uuid", "status": "queued", "url": "/posts/uuid" }
```

Errors: `400` invalid form, `401` session required, `403` invalid origin, `409` duplicate file, `413` size limit and `429` limit of 100 uploads per account per hour. Accepting an upload does not guarantee successful decoding; the post page displays the worker's result.

## Media

```http
GET /media/:id/thumbnail
GET /media/:id/preview
GET /media/:id/original
```

Search ratings do not change post permissions. Nonpublic media requires ownership or moderator privileges. Both missing and unauthorized media return `404`. Originals are unavailable until their type has been validated.

## Sessions and actions

Better Auth is mounted at `/api/auth/*`. The interface uses its Svelte client for registration, sign-in and sign-out.

Editing, favorites and moderation use SvelteKit form actions. They do not yet have a stable REST v1 contract in this alpha. The v1 write API uses same-origin sessions; personal tokens and permissions for external integrations are on the roadmap.
