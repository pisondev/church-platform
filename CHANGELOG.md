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
- GitHub Actions workflow that checks commit messages, the API and both frontends.
- About, Contact, Privacy Policy and Terms of Service pages on the public site, with a shared header and footer.
- Google sign-in setup guide and the matching `.env.example` entries.
- Cipher notation engine in the admin panel: a text format for notes and lyrics, a parser that validates syllable counts, and a renderer that draws beams, slurs, octave dots, accidentals and bar lines.
- Song library preview with KJ 40 and PKJ 192: verse selection, slides of two phrases at most, keyboard and click navigation, and full-screen presenting.

### Changed

- The product is now named EccleService, with the tagline "a service for your Ecclesia (a.k.a Church)".

### Fixed

- `commit-msg` hook missed the robot emoji when run inside `git push` on Windows, which made the `pre-push` tests fail.
