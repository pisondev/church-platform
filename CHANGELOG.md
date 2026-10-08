# Changelog

All notable changes are recorded here, grouped by the date they landed, newest first. Inside a date the entries use the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) categories. Version numbers will follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once releases start.

## 2026-10-08

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
- GitHub Actions workflow that checks commit messages, the API and both frontends.
- About, Contact, Privacy Policy and Terms of Service pages on the public site, with a shared header and footer.
- Google sign-in setup guide and the matching `.env.example` entries.
- Cipher notation engine in the admin panel: a text format for notes and lyrics, a parser that validates syllable counts, and a renderer that draws beams, slurs, octave dots, accidentals and bar lines.
- Song library preview with KJ 40 and PKJ 192: verse selection, slides of two phrases at most, keyboard and click navigation, and full-screen presenting.
- `pre-commit` hook and CI check that keep AI tool files out of the repository.
- Google sign-in in the API: authorization code flow with PKCE, registered emails only, sessions in an httpOnly cookie backed by a `sessions` table, and `/api/v1/auth` endpoints for sign-in, the current user and sign-out.
- Origin check on every state-changing request.
- Login page on the public site with a message for each sign-in failure.
- Templates in the API: `templates` and `template_slides` tables, read endpoints scoped to the churches a user manages, and a seeded "Liturgi Umum" template for GKJ Sentolo.
- `pnpm check` runs lint, type-check, tests and builds together.
- Endpoint to rename a template.
- Church and template pages in the admin panel: the home page links to each church, a church lists its templates, and a template previews its slides, with long responsive readings spread over numbered frames.
- Session gate in the admin panel: pages show only to a signed-in user, with a header for navigation, the user and sign-out, and a home page listing the churches they manage.

### Changed

- The product is now named EccleService, with the tagline "a service for your Ecclesia (a.k.a Church)".
- Both apps are light only and no longer follow the system dark setting. Slides are dark text on white, which stays readable on a weak projector.
- The API listens on loopback only outside production, so `pnpm dev:api` no longer triggers the Windows firewall prompt.
- The changelog is grouped by date.

### Fixed

- Admin build failed on the song page once the session gate was in place, because its metadata read the route params. The page now uses a static title.
- `commit-msg` hook missed the robot emoji when run inside `git push` on Windows, which made the `pre-push` tests fail.
