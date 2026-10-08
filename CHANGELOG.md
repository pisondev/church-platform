# Changelog

All notable changes are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Monorepo skeleton with a pnpm workspace.
- `commit-msg` hook that rejects AI attribution, with tests and a range checker for CI.
- `pre-push` hook that runs the unit tests.
- `.env.example` listing the runtime configuration.
- API service (Go, Gin) with environment-based configuration, request IDs, structured access logs, panic recovery, CORS for the frontends, and `/healthz` and `/readyz`.
- Docker Compose service for local PostgreSQL, with a separate test database.
- Identity schema (`churches`, `users`, `church_admins`) as embedded SQL migrations, with `migrate` and `seed` commands.
- Seed data: the GKJ Sentolo church and Super Admin accounts from `SUPER_ADMIN_EMAILS`.
- Database tests that run in isolated schemas when `TEST_DATABASE_URL` is set.
- Public site and admin panel as separate Next.js apps with Tailwind CSS, Lucide icons, typed English messages through next-intl, and Vitest tests.
