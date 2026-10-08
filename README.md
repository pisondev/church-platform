# EccleService

*a service for your Ecclesia (a.k.a Church)*

Church management platform, built as a multi-tenant service. The repository keeps its original name, `church-platform`.

The first feature in scope is Presentation: reusable liturgy templates and the weekly slides made from them.

## Layout

| Path | Purpose |
| --- | --- |
| `apps/api` | HTTP API (Go, Gin, PostgreSQL) |
| `apps/web` | Public site: landing, About, Contact, Privacy Policy, Terms of Service and the login page (Next.js, Tailwind CSS, Lucide) |
| `apps/admin` | Admin panel for Super Admins and Church Admins: churches, templates, the song library and slide previews (Next.js, Tailwind CSS, Lucide) |
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
| `pnpm test:hooks` | Tests the git hooks |
| `pnpm test:api` | Runs the API tests; database tests are skipped |
| `pnpm test:api:db` | Runs the API tests including the database tests |
| `pnpm build` | Builds the API binary into `apps/api/bin` and both frontends |
| `pnpm check` | Lint, type-check, test and build in one go. Run it before every commit |

## Configuration

The API reads environment variables, and loads `.env` from the repository root in development.

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_ENV` | `development` | `development`, `test` or `production` |
| `API_ADDR` | `127.0.0.1:4000`, or `:4000` in production | Listen address. Loopback in development keeps Windows from asking for firewall permission on every run |
| `DATABASE_URL` | required | PostgreSQL connection string |
| `WEB_URL` | `http://localhost:3100` | Public site. Failed sign-ins return here |
| `ADMIN_URL` | `http://localhost:3101` | Admin panel. Successful sign-ins land here |
| `CORS_ALLOWED_ORIGINS` | `WEB_URL` and `ADMIN_URL` | Origins allowed to call the API with credentials |
| `COOKIE_DOMAIN` | empty | Domain of the session cookie, for example `.example.org` when the apps use subdomains |
| `SUPER_ADMIN_EMAILS` | empty | Emails that hold the Super Admin role |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URL` | empty | OAuth client for sign-in, see [Google sign-in setup](docs/google-oauth-setup.md). Required in production |

The frontends read these at build time:

| Variable | Default | Used by |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Both apps, to reach the API |
| `NEXT_PUBLIC_WEB_URL` | `http://localhost:3100` | `apps/admin`, to send signed-out visitors to the login page |

## Database

Migrations are plain SQL files in `apps/api/internal/database/migrations`, embedded in the binary and applied by [goose](https://github.com/pressly/goose). Add a file named `NNNNN_description.sql` with `-- +goose Up` and `-- +goose Down` sections.

| Table | Holds |
| --- | --- |
| `churches` | Tenants. Every church-owned table references one |
| `users` | Accounts, matched to Google sign-ins by email. `is_super_admin` marks platform owners |
| `church_admins` | Which users administer which churches |
| `sessions` | Signed-in browsers. Holds the SHA-256 of each session token, never the token |
| `templates` | Reusable orders of worship, per church, with a slide ratio |
| `template_slides` | The slides of a template in order. `kind` is `cover`, `section`, `song`, `scripture` or `responsive_reading`, and `content` is JSON shaped by the kind |

Churches and users are soft-deleted through `deleted_at`. Emails are stored lowercase.

`pnpm db:seed` creates the first church, GKJ Sentolo, grants Super Admin to every email in `SUPER_ADMIN_EMAILS`, and creates the first template, "Liturgi Umum", from the order of worship the church already uses. The template is created once: a later seed leaves an edited template alone.

Database tests need `TEST_DATABASE_URL`. Each test runs in its own schema and drops it afterwards.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /healthz` | Liveness: the process is up |
| `GET /readyz` | Readiness: the database answers |
| `GET /api/v1/auth/google/start` | Starts Google sign-in. `?redirect=/path` chooses the admin page to land on |
| `GET /api/v1/auth/google/callback` | Finishes sign-in, sets the session cookie and redirects |
| `GET /api/v1/auth/me` | The signed-in user and the churches they manage, or 401 |
| `POST /api/v1/auth/logout` | Ends the session |
| `GET /api/v1/churches/:slug` | A church the user manages |
| `GET /api/v1/churches/:slug/templates` | Its templates, with slide counts |
| `GET /api/v1/churches/:slug/templates/:id` | One template with its slides in order |
| `PATCH /api/v1/churches/:slug/templates/:id` | Renames a template. Body `{"name": "..."}`, 1 to 120 characters; 409 when the church already has that name |

Sign-in is Google only and limited to emails that already exist in `users`: Super Admins come from `SUPER_ADMIN_EMAILS` through `pnpm db:seed`. The session is an opaque token in an httpOnly, SameSite=Lax cookie that lasts 7 days. A failed sign-in redirects to `WEB_URL/login?error=<reason>`.

Church routes need a session. A Super Admin reaches every church, a Church Admin only the ones assigned to them; anything else answers 404, the same as a church that does not exist.

Every state-changing request must carry an `Origin` header from the allowed origins, otherwise it gets 403.

Errors use one envelope: `{"error": {"code": "not_found", "message": "resource not found"}}`. Every response carries an `X-Request-ID` header, reused from the request when well formed.

## Frontends

Both apps use the Next.js App Router with Cache Components enabled, so pages are prerendered unless they opt into request-time data.

- **Product identity.** The name, tagline, operator and contact email live in `src/config/site.ts` of each app. Change them there only.
- **Legal text.** The Privacy Policy and Terms of Service are English only and live in `apps/web/src/content`. They are drafts until reviewed.
- **Copy.** UI text lives in `messages/en.json` and is read through [next-intl](https://next-intl.dev). Keys are type-checked. To add a language, add its code to `src/i18n/config.ts`, add `messages/<code>.json`, and resolve the locale in `src/i18n/request.ts`.
- **Sign-in.** The login page is `/login` on the public site and hands over to the API. The admin panel wraps every page in `SessionGate`, which asks the API for the session and shows the app only to a signed-in user. The API is what enforces access; the gate is the front door.
- **Theme.** Light only, and slides are dark text on white, because weak projectors wash out dark screens. Colors are CSS variables in each app's `globals.css`, so a dark theme can be added later by overriding them.
- **Tests.** Vitest with Testing Library. `renderWithMessages` in `src/test-utils.tsx` renders a component with the English messages.

## Churches and templates

The admin home lists the churches the signed-in user manages, and a church page lists its templates.

A template is an ordered list of slides of five kinds: cover, section, song, scripture and responsive reading. Song and scripture slides are empty slots, filled when a presentation is made. A responsive reading that does not fit on one screen is spread over numbered screens, and each role has its own color.

Opening a template starts the editor, laid out like a slides application:

- **Header.** One thin row. The logo leads back to the church. The name is edited in place: Enter or leaving the field saves, Escape restores it. Next to it are the File, View and Slide menus; on the right, the Slideshow button and the signed-in account.
- **Slide panel.** Every slide in a numbered column on the left, scrolling on its own. The selected slide stays in view. The icon at its top closes the panel, and the icon in the status line, or View > Show the slide panel, brings it back.
- **Stage.** The selected slide, fitted to the space available. A reading that takes several screens can be paged through from the status line.

Arrow keys, Page Up, Page Down, Home and End move between slides. Slideshow covers the screen, starts from the selected slide and closes with Escape.

The size of the slide on the stage is set inline rather than in `globals.css`. Without a width the slide collapses to nothing, and a development server can serve an older stylesheet than the one on disk.

### Cover bumper

The cover of a church that has a logo is a bumper: a short motion piece that repeats for as long as the slide is shown. One round takes 14 seconds:

1. The logo comes up from below the frame, flipping three times around its vertical axis. It leaves fast, slows down, passes the center by a little and sinks back onto it. A soft shadow follows it.
2. It glides to the left, shrinking a little, and uncovers the title, which comes out from behind it.
3. The date line appears under the title, moving in from the left. It is smaller than the title by the golden ratio.
4. When the cover has a footer, a band of frosted glass rises from the bottom edge, as wide as the frame, and everything above moves up to make room. The band carries the footer as a notice, next to a phone under a red "not allowed" sign.
5. Everything rests, then fades out, and the next round starts from an empty frame.

The text comes from the cover slide:

- **Title.** `{n}` in it stands for which Sunday of the month the service falls on: "Ibadah Minggu ke-{n}" reads "Ibadah Minggu ke-2" on the second Sunday.
- **Date line.** A template has no date of its own, so the cover is dated for the coming Sunday, or today on a Sunday, in Indonesian: "Minggu, 11 Oktober 2026". Presentations will bring their own date.
- **Notice.** The footer of the cover, meant for the request to silence phones. Text between asterisks is set in italics, for words in another language: "Handphone mohon dimatikan atau *silent*". Without a footer there is no band and nothing moves up.
- The subtitle has no place in the bumper yet.

Behind the bumper lies a backdrop: a bright, mostly white frame with a breath of sky at the top and three slow waves of light blue along the bottom. The waves keep moving on their own and do not start over with each round, and the band of glass blurs them as it rises.

The bumper and its backdrop play on the stage and in the slideshow. The slide panel shows them at rest. A cover of a church without a logo shows its title, subtitle and footer as plain text.

The motion is in `apps/admin/src/features/templates/bumper.tsx`, with every timing and size at the top of the file, the backdrop in `backdrop.tsx` and the date in `service-date.ts`. It runs on the Web Animations API, so it does not depend on a stylesheet, and it plays even when the system asks for reduced motion, because it is content like a video. Logos ship with the app for now, in `apps/admin/public/logos`, listed by church slug in `church-logo.ts`. Churches cannot upload their own yet.

The editor can rename a template so far. Adding, changing, moving and removing slides is not built yet, and neither are weekly presentations. The first template, "Liturgi Umum" for GKJ Sentolo, comes from `pnpm db:seed`.

## Songs and slides

The admin panel has a song library at `/songs`. Each song is stored as text and drawn by the system as cipher notation with aligned lyrics; see [Song notation format](docs/notation.md).

A song page lets you choose verses and previews the slides: a title slide, then two phrases per slide at most. The slideshow moves with the arrow keys, Page Up, Page Down, Space, Home, End or a click, and Present opens it full screen.

Two songs are built in for now, KJ 40 and PKJ 192.

## Git hooks

`pnpm install` sets `core.hooksPath` to `.githooks`.

- `commit-msg` rejects messages that attribute the work to an AI tool: `Co-Authored-By` trailers naming one, "Generated with ..." lines, vendor emails and links.
- `pre-commit` refuses files that belong to an AI coding tool, such as assistant instruction files and their settings folders. Keep those local through `.git/info/exclude`.
- `pre-push` runs `pnpm test` and aborts the push on failure.

`scripts/check-commits.sh [<range>]` applies the message check to existing commits, and `git ls-files | sh scripts/check-ai-files.sh` applies the file check to everything tracked. CI runs both.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests.

| Job | Checks |
| --- | --- |
| Repository rules | Hook tests, no AI attribution anywhere in the history, no AI tool files tracked |
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
