# Operations

## Initial configuration

1. Run `bun run setup` and adjust `.env`.
2. Set `ORIGIN` to the actual URL. For a public installation, terminate HTTPS at your proxy.
3. Set `POSTGRES_PASSWORD` before creating the database volume. For local development, also update `DATABASE_URL`.
4. Run `docker compose up -d --build`, create an account and run `admin:promote`.
5. Enable `REQUIRE_APPROVAL=true` if the community reviews posts before displaying them.

Compose exposes PostgreSQL and Redis on loopback only to support local development. The web app uses host port 5173. If using a reverse proxy, adjust the port binding for your deployment.

If you need the original client IP behind a proxy, configure `adapter-node` variables such as `ADDRESS_HEADER` and `XFF_DEPTH` for your infrastructure. The selected header must be overwritten by a trusted proxy, and the application must receive traffic only from that proxy.

## Checking status

```bash
docker compose ps
docker compose logs --follow web worker
```

`/api/health` returns `200` when PostgreSQL responds. Check the worker logs if an upload stays queued. The web app can accept uploads while Redis is temporarily unavailable: pending rows will be reconciled when the service returns.

## Updates

Keep a consistent backup before applying a release with migrations. To update to a new code revision:

```bash
docker compose stop web worker
docker compose build
docker compose run --rm migrate
docker compose up -d web worker
```

Migrations run explicitly; deployments do not use `drizzle-kit push`. If an update requires incompatible changes, restoring requires the corresponding backup and application version.

## Consistent backup: PostgreSQL and local media

Run from the repository root. Use a new folder for each backup:

```bash
mkdir -p backups/my-backup
docker compose stop web worker
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backups/my-backup/database.dump
docker compose run --rm --no-deps -T web tar -C /data/media -czf - . > backups/my-backup/media.tar.gz
docker compose up -d web worker
```

Check that both backup commands completed successfully before considering the backup valid. Keep the installation's `.env` and code revision alongside the backup in a private location. `database.dump` contains accounts and sessions; the media archive contains originals and derivatives.

Pausing the web app and worker prevents changes between the SQL dump and the media backup. Redis can be rebuilt from pending PostgreSQL rows; it is not the source of truth for jobs.

## Restoring to a separate installation

Prepare the same application version, configure its `.env` and copy the backup files. Keep the web app and worker stopped until restoration is complete:

```bash
docker compose up -d db redis
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < backups/my-backup/database.dump
docker compose run --rm --no-deps -T web tar -C /data/media -xzf - < backups/my-backup/media.tar.gz
docker compose run --rm migrate
docker compose up -d web worker
```

Verify sign-in, search, viewing a post's original image and a new upload. Keep the backup until that workflow has been verified on the destination.

For S3, replace the media archive with a consistent bucket backup or snapshot. The web app and worker must point to the restored bucket, using the same keys recorded in PostgreSQL.

## Operational scope of the alpha

The Compose image, Docker volume recovery and S3 adapter require testing in the specific deployment environment. The project's automated tests cover local storage, migrations, processing, the interface and permissions. The roadmap includes orphaned-file cleanup, worker metrics and guided updates.
