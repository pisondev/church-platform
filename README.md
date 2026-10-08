# Church Platform

Church management platform, built as a multi-tenant service. "Church Platform" is a working name.

The first feature in scope is Presentation: reusable liturgy templates and the weekly slides made from them.

## Layout

| Path | Purpose |
| --- | --- |
| `apps/api` | HTTP API (Go, Gin, PostgreSQL) |
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
pnpm dev:api        # API on http://localhost:4000
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev:api` | Runs the API |
| `pnpm db:up` / `pnpm db:down` | Starts or stops the local PostgreSQL container |
| `pnpm lint` | Vets the Go code |
| `pnpm test` | Runs every unit test |
| `pnpm test:hooks` | Tests the commit message hook |
| `pnpm test:api` | Runs the API tests |
| `pnpm build` | Builds the API binary into `apps/api/bin` |

## Configuration

The API reads environment variables, and loads `.env` from the repository root in development.

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_ENV` | `development` | `development`, `test` or `production` |
| `API_ADDR` | `:4000` | Listen address |
| `DATABASE_URL` | required | PostgreSQL connection string |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3100,http://localhost:3101` | Origins allowed to call the API with credentials |
| `SUPER_ADMIN_EMAILS` | empty | Emails that hold the Super Admin role |

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /healthz` | Liveness: the process is up |
| `GET /readyz` | Readiness: the database answers |

Errors use one envelope: `{"error": {"code": "not_found", "message": "resource not found"}}`. Every response carries an `X-Request-ID` header, reused from the request when well formed.

## Git hooks

`pnpm install` sets `core.hooksPath` to `.githooks`.

- `commit-msg` rejects messages that attribute the work to an AI tool: `Co-Authored-By` trailers naming one, "Generated with ..." lines, vendor emails and links.
- `pre-push` runs `pnpm test` and aborts the push on failure.

`scripts/check-commits.sh [<range>]` applies the same message check to existing commits. CI uses it.

## Conventions

- English for code, comments, logs, docs, commits and UI copy.
- [Conventional Commits](https://www.conventionalcommits.org) for messages, [Keep a Changelog](https://keepachangelog.com) for `CHANGELOG.md`.
- Every commit updates the affected docs and ships with tests.
- Work lands directly on `main`.

## Documentation

- [Changelog](CHANGELOG.md)
- [Deployment checklist](docs/deployment.md)
