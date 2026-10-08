# Church Platform

Church management platform, built as a multi-tenant service. "Church Platform" is a working name.

The first feature in scope is Presentation: reusable liturgy templates and the weekly slides made from them.

## Layout

| Path | Purpose |
| --- | --- |
| `.githooks` | Versioned git hooks |
| `scripts` | Repository tooling and its tests |
| `docs` | Project documentation |

## Requirements

- Node.js 22+ and pnpm 10
- Git with its bundled `sh`

## Setup

```sh
pnpm install        # also points git at .githooks
cp .env.example .env
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm test` | Runs every unit test |
| `pnpm test:hooks` | Tests the commit message hook |

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
