# EccleService

*a service for your Ecclesia (a.k.a Church)*

Church management platform, built as a multi-tenant service. The repository keeps its original name, `church-platform`.

The first feature in scope is Presentation: reusable liturgy templates and the weekly slides made from them.

## Layout

| Path | Purpose |
| --- | --- |
| `apps/api` | HTTP API (Go, Gin, PostgreSQL) |
| `apps/web` | Public site: landing, About, Contact, Privacy Policy and Terms of Service (Next.js, Tailwind CSS, Lucide) |
| `apps/admin` | Admin panel for Super Admins and Church Admins, with the song library and slide preview (Next.js, Tailwind CSS, Lucide) |
| `infra` | Local infrastructure files used by Docker Compose |
| `.githooks` | Versioned git hooks |
| `scripts` | Repository tooling and its tests |
| `docs` | Project documentation |

## Requirements

- Node.js 22+ and pnpm 10
- Go 1.23+ (the toolchain in `apps/api/go.mod` is downloaded automatically)
- Docker with Compose
- Git with its bundled `sh`

## Setup

```sh
pnpm install        # also points git at .githooks
cp .env.example .env
pnpm db:up          # PostgreSQL on localhost:5433
pnpm db:migrate     # apply the schema
pnpm db:seed        # first church and Super Admins
pnpm dev:api        # API on http://localhost:4000
pnpm dev:web        # public site on http://localhost:3100
pnpm dev:admin      # admin panel on http://localhost:3101
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev:api` | Runs the API |
| `pnpm dev:web` / `pnpm dev:admin` | Runs the public site or the admin panel |
| `pnpm db:up` / `pnpm db:down` | Starts or stops the local PostgreSQL container |
| `pnpm db:migrate` | Applies pending migrations |
| `pnpm db:seed` | Inserts the baseline data; safe to repeat |
| `pnpm lint` | Vets the Go code and runs ESLint on both frontends |
| `pnpm typecheck` | Type-checks both frontends |
| `pnpm test` | Runs every unit test |
| `pnpm test:hooks` | Tests the commit message hook |
| `pnpm test:api` | Runs the API tests; database tests are skipped |
| `pnpm test:api:db` | Runs the API tests including the database tests |
| `pnpm build` | Builds the API binary into `apps/api/bin` and both frontends |

## Configuration

The API reads environment variables, and loads `.env` from the repository root in development.

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_ENV` | `development` | `development`, `test` or `production` |
| `API_ADDR` | `:4000` | Listen address |
| `DATABASE_URL` | required | PostgreSQL connection string |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3100,http://localhost:3101` | Origins allowed to call the API with credentials |
| `SUPER_ADMIN_EMAILS` | empty | Emails that hold the Super Admin role |

The frontends read these at build time:

| Variable | Default | Used by |
| --- | --- | --- |
| `NEXT_PUBLIC_ADMIN_URL` | `http://localhost:3101` | `apps/web`, for the sign-in link |
| `NEXT_PUBLIC_WEB_URL` | `http://localhost:3100` | `apps/admin`, for the link back to the site |

## Database

Migrations are plain SQL files in `apps/api/internal/database/migrations`, embedded in the binary and applied by [goose](https://github.com/pressly/goose). Add a file named `NNNNN_description.sql` with `-- +goose Up` and `-- +goose Down` sections.

| Table | Holds |
| --- | --- |
| `churches` | Tenants. Every church-owned table references one |
| `users` | Accounts, matched to Google sign-ins by email. `is_super_admin` marks platform owners |
| `church_admins` | Which users administer which churches |

Churches and users are soft-deleted through `deleted_at`. Emails are stored lowercase.

`pnpm db:seed` creates the first church, GKJ Sentolo, and grants Super Admin to every email in `SUPER_ADMIN_EMAILS`.

Database tests need `TEST_DATABASE_URL`. Each test runs in its own schema and drops it afterwards.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /healthz` | Liveness: the process is up |
| `GET /readyz` | Readiness: the database answers |

Errors use one envelope: `{"error": {"code": "not_found", "message": "resource not found"}}`. Every response carries an `X-Request-ID` header, reused from the request when well formed.

## Frontends

Both apps use the Next.js App Router with Cache Components enabled, so pages are prerendered unless they opt into request-time data.

- **Product identity.** The name, tagline, operator and contact email live in `src/config/site.ts` of each app. Change them there only.
- **Legal text.** The Privacy Policy and Terms of Service are English only and live in `apps/web/src/content`. They are drafts until reviewed.
- **Copy.** UI text lives in `messages/en.json` and is read through [next-intl](https://next-intl.dev). Keys are type-checked. To add a language, add its code to `src/i18n/config.ts`, add `messages/<code>.json`, and resolve the locale in `src/i18n/request.ts`.
- **Tests.** Vitest with Testing Library. `renderWithMessages` in `src/test-utils.tsx` renders a component with the English messages.

## Songs and slides

The admin panel has a song library at `/songs`. Each song is stored as text and drawn by the system as cipher notation with aligned lyrics; see [Song notation format](docs/notation.md).

A song page lets you choose verses and previews the slides: a title slide, then two phrases per slide at most. The slideshow moves with the arrow keys, Page Up, Page Down, Space, Home, End or a click, and Present opens it full screen.

Two songs are built in for now, KJ 40 and PKJ 192. Sign-in, templates and stored presentations are not built yet.

## Git hooks

`pnpm install` sets `core.hooksPath` to `.githooks`.

- `commit-msg` rejects messages that attribute the work to an AI tool: `Co-Authored-By` trailers naming one, "Generated with ..." lines, vendor emails and links.
- `pre-push` runs `pnpm test` and aborts the push on failure.

`scripts/check-commits.sh [<range>]` applies the same message check to existing commits. CI uses it.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests.

| Job | Checks |
| --- | --- |
| Commit messages | Hook tests, and no AI attribution anywhere in the history |
| API | `gofmt`, `go vet`, tests against a PostgreSQL service, build |
| Frontends | ESLint, type-check, Vitest and production build for both apps |

## Conventions

- English for code, comments, logs, docs, commits and UI copy.
- [Conventional Commits](https://www.conventionalcommits.org) for messages.
- `CHANGELOG.md` is grouped by date, newest first, with the [Keep a Changelog](https://keepachangelog.com) categories inside each date. Add a new `## YYYY-MM-DD` section on the first change of a day.
- Every commit updates the affected docs and ships with tests.
- Work lands directly on `main`.

## Documentation

- [Changelog](CHANGELOG.md)
- [Deployment checklist](docs/deployment.md)
- [Google sign-in setup](docs/google-oauth-setup.md)
- [Song notation format](docs/notation.md)
