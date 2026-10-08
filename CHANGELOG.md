# Changelog

All notable changes are recorded here, grouped by the date they landed, newest first. Inside a date the entries use the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) categories. Version numbers will follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once releases start.

## 2026-10-09

### Added

- Cover bumper: the cover of a church with a logo is a looping motion piece. The logo rises from below the frame while flipping three times, passes the center a little and settles on it with a soft shadow. It then glides left, shrinking a little, and uncovers the title; the date line follows; a band of frosted glass rises from the bottom edge, carrying the wordmark of the church on the left and the footer as a notice on the right, next to a phone under a red "not allowed" sign. Everything above moves up to make room, and so does the water of the backdrop. It plays on the stage and in the slideshow, and stands still in the slide panel.
- Backdrop behind the bumper: a bright frame with a breath of sky at the top, a kawung batik pattern in the top corners, and slow waves of light blue along the bottom, moving on their own.
- Slideshow: frames change with a brief fade out and a fade in, the default change between slides.
- A song slide of a template can name a song of the library. It then shows that song: its title, then two phrases at a time.
- Five songs, written out as notation and lyrics: NR 3, PKJ 15, NKB 225, KP 102 and the response "Haleluya, Amin". The seeded template names them where they are sung every week, which brings it to 52 slides.
- Song books NKB, NR and KP. A sung response can belong to no book, and a song can be one piece without numbered verses.
- Triplets in the song notation: `{4 3 2}`.
- `{n}` in a cover title stands for which Sunday of the month the service falls on.
- Text between asterisks in a cover footer is set in italics, for words in another language.
- Covers are dated for the coming Sunday, in Indonesian, until presentations carry their own date.
- The GKJ Sentolo emblem and wordmark as app assets, `apps/admin/public/logos/gkj-sentolo.webp` and `gkj-sentolo-wordmark.webp`.

### Changed

- Section slides stand on the backdrop of the bumper, with the title in navy running into blue, a short rule under it and a brief entrance of title, rule and direction.
- The cover of a church with a logo shows its title, a date line and its footer through the bumper. Its subtitle is not shown.
- Seeded cover of "Liturgi Umum": the title is "Ibadah Minggu ke-{n}", the welcome line moved to the subtitle, and "silent" in the footer is marked for italics. A database seeded earlier keeps its old cover.
- Template editor layout: the header is one thin row, and the slides moved from a strip along the bottom to a numbered panel on the left that can be closed and reopened.

### Removed

- `gkj-logo-hd_without-bg.png` from the repository root. The source picture was committed by accident; the app uses the smaller copy in `apps/admin/public/logos`.

### Fixed

- The editor stage was blank when a development server served a stylesheet older than the one on disk. The slide is now sized inline.

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
- Template editor in the admin panel, laid out like a slides application: a header with the logo, an editable name and File, View and Slide menus, the selected slide on a stage, and a filmstrip along the bottom that scrolls sideways. Slideshow presents from the selected slide.
- Church and template pages in the admin panel: the home page links to each church, a church lists its templates, and a template previews its slides, with long responsive readings spread over numbered frames.
- Session gate in the admin panel: pages show only to a signed-in user, with a header for navigation, the user and sign-out, and a home page listing the churches they manage.

### Changed

- Admin pages are grouped: panel pages share one header, and the editor has its own full-screen layout.
- The product is now named EccleService, with the tagline "a service for your Ecclesia (a.k.a Church)".
- Both apps are light only and no longer follow the system dark setting. Slides are dark text on white, which stays readable on a weak projector.
- The API listens on loopback only outside production, so `pnpm dev:api` no longer triggers the Windows firewall prompt.
- The changelog is grouped by date.

### Fixed

- Admin build failed on the song page once the session gate was in place, because its metadata read the route params. The page now uses a static title.
- `commit-msg` hook missed the robot emoji when run inside `git push` on Windows, which made the `pre-push` tests fail.
