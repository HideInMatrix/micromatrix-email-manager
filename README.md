# micromatrix-email-manager

Nuxt 4 mailbox account manager with Prisma ORM and a local SQLite database.

## Local Commands

```bash
pnpm install
pnpm db:push
pnpm dev
```

The default database is `.data/micromatrix-email-manager.sqlite`.

## Configuration

`.env` only stores deployment-level settings:

```bash
SITE_URL=http://127.0.0.1:3000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-admin-password
TOKEN_ENCRYPTION_KEY=replace-with-at-least-32-random-characters
```

Provider OAuth settings are stored in SQLite and configured from
`/dashboard/config` after admin login. Use these redirect URIs in each provider
console:

- Gmail: `{SITE_URL}/api/mail/oauth/gmail/callback`
- Outlook: `{SITE_URL}/api/mail/oauth/outlook/callback`

## Docker

```bash
cp .env.example .env
docker compose up --build -d
```

`docker-compose.yml` exposes the app on `APP_PORT` or `3000` by default and stores the
SQLite database in the `micromatrix-email-manager-data` volume. The container runs
`prisma db push --skip-generate` before starting, so a new volume is initialized
automatically.

For a published image:

```bash
MICROMATRIX_EMAIL_MANAGER_IMAGE=ghcr.io/OWNER/REPO:latest docker compose up -d
```

## GitHub Actions

Pushing a Git tag builds and pushes one Docker image build with two tags:

- `ghcr.io/OWNER/REPO:<tag>`
- `ghcr.io/OWNER/REPO:latest`

The workflow passes both tags to one `docker/build-push-action` step, so the
Nuxt frontend is built only once per release.
